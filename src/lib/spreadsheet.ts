/**
 * Minimal, dependency-free spreadsheet reader for .xlsx and .csv files.
 * Runs entirely in the browser: the file never leaves the device until the
 * validated rows are inserted through the normal (RLS-protected) API.
 */

export type SheetRows = string[][];

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function readSpreadsheet(file: File): Promise<SheetRows> {
  if (file.size > MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE');
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsv(decodeText(buffer));
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) return readXlsx(buffer);
  throw new Error('UNSUPPORTED_FILE');
}

// ---------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------

/** UTF-8 first; falls back to Windows-874 (Thai Excel "CSV" export). */
function decodeText(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  const text = utf8.includes('\uFFFD') ? new TextDecoder('windows-874').decode(buffer) : utf8;
  return text.replace(/^\uFEFF/, '');
}

export function parseCsv(text: string): SheetRows {
  const delimiter = detectDelimiter(text);
  const rows: SheetRows = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const counts = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][0];
}

// ---------------------------------------------------------------------
// XLSX (a ZIP of XML parts). Reads the first worksheet only.
// ---------------------------------------------------------------------

interface ZipEntry {
  method: number;
  compressedSize: number;
  localOffset: number;
}

function readZipDirectory(view: DataView): Map<string, ZipEntry> {
  // End of central directory record: scan backwards (max comment is 64 KiB).
  let eocd = -1;
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('INVALID_XLSX');

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();

  for (let n = 0; n < count; n++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('INVALID_XLSX');
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + offset + 46, nameLen));
    entries.set(name.replace(/\\/g, '/'), { method, compressedSize, localOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readZipEntry(view: DataView, entry: ZipEntry): Promise<string> {
  const o = entry.localOffset;
  if (view.getUint32(o, true) !== 0x04034b50) throw new Error('INVALID_XLSX');
  const start = o + 30 + view.getUint16(o + 26, true) + view.getUint16(o + 28, true);
  // slice() copies into a plain ArrayBuffer-backed array (required by Blob typing).
  const data = new Uint8Array(view.buffer, view.byteOffset + start, entry.compressedSize).slice();

  if (entry.method === 0) return new TextDecoder().decode(data);
  if (entry.method !== 8) throw new Error('INVALID_XLSX');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('INVALID_XLSX');
  return doc;
}

/** Namespace-agnostic lookup (some generators prefix SpreadsheetML tags). */
function byTag(node: Document | Element, tag: string): Element[] {
  return Array.from(node.getElementsByTagNameNS('*', tag));
}

function textOf(node: Element): string {
  // Concatenate rich-text runs but skip phonetic hints (<rPh>).
  return byTag(node, 't')
    .filter((t) => t.parentElement?.localName !== 'rPh')
    .map((t) => t.textContent ?? '')
    .join('');
}

function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) break;
    n = n * 26 + (code - 64);
  }
  return n - 1;
}

async function firstSheetPath(view: DataView, entries: Map<string, ZipEntry>): Promise<string> {
  const fallback = 'xl/worksheets/sheet1.xml';
  const wb = entries.get('xl/workbook.xml');
  const rels = entries.get('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) return fallback;

  const sheet = byTag(parseXml(await readZipEntry(view, wb)), 'sheet')[0];
  const rid =
    sheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ??
    sheet?.getAttribute('r:id');
  if (!rid) return fallback;

  const rel = byTag(parseXml(await readZipEntry(view, rels)), 'Relationship').find((r) => r.getAttribute('Id') === rid);
  const target = rel?.getAttribute('Target');
  if (!target) return fallback;
  return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
}

async function readXlsx(buffer: ArrayBuffer): Promise<SheetRows> {
  const view = new DataView(buffer);
  const entries = readZipDirectory(view);

  const sharedEntry = entries.get('xl/sharedStrings.xml');
  const shared = sharedEntry ? byTag(parseXml(await readZipEntry(view, sharedEntry)), 'si').map(textOf) : [];

  const sheetEntry = entries.get(await firstSheetPath(view, entries));
  if (!sheetEntry) throw new Error('INVALID_XLSX');
  const sheet = parseXml(await readZipEntry(view, sheetEntry));

  const rows: SheetRows = [];
  for (const rowEl of byTag(sheet, 'row')) {
    const rowNumber = Number(rowEl.getAttribute('r')) || rows.length + 1;
    const cells: string[] = [];
    let next = 0;
    for (const c of Array.from(rowEl.children).filter((el) => el.localName === 'c')) {
      const ref = c.getAttribute('r');
      const col = ref ? columnIndex(ref) : next;
      next = col + 1;
      const type = c.getAttribute('t');
      const v = byTag(c, 'v')[0]?.textContent ?? '';
      let value: string;
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = textOf(c);
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else value = v;
      cells[col] = value;
    }
    rows[rowNumber - 1] = Array.from(cells, (x) => x ?? '');
  }
  return Array.from(rows, (r) => r ?? []);
}
