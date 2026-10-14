import { CASE_NUMBER_PATTERN } from '@/lib/validation';
import type { SheetRows } from '@/lib/spreadsheet';
import type { Court } from '@/types';

export const MAX_IMPORT_ROWS = 2000;

type Field = 'accused_name' | 'court' | 'black_case_number' | 'red_case_number' | 'note';

/** Header keywords (checked in this order: "ชื่อศาล" must map to court, not name). */
const HEADER_KEYWORDS: Array<[Field, string[]]> = [
  ['black_case_number', ['คดีดำ', 'ดำ', 'black']],
  ['red_case_number', ['คดีแดง', 'แดง', 'red']],
  ['court', ['ศาล', 'court']],
  ['note', ['หมายเหตุ', 'note', 'remark']],
  ['accused_name', ['ชื่อ', 'name', 'ผู้ถูกกล่าวหา', 'ผู้ต้องหา', 'จำเลย']],
];

/** Used when the file has no recognisable header row. */
const DEFAULT_COLUMNS: Record<Field, number> = {
  accused_name: 0,
  court: 1,
  black_case_number: 2,
  red_case_number: 3,
  note: 4,
};

export interface ImportRow {
  /** 1-based row number in the spreadsheet, for error messages. */
  line: number;
  accused_name: string;
  court_name: string;
  court_id: string | null;
  black_case_number: string;
  red_case_number: string;
  note: string;
  errors: string[];
}

export interface ParsedImport {
  rows: ImportRow[];
  hasHeader: boolean;
  truncated: boolean;
}

const normalizeHeader = (s: string) => s.replace(/\s+/g, '').toLowerCase();
const normalizeName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const normalizeNumber = (s: string) => s.replace(/\s/g, '').toLowerCase();

function detectColumns(row: string[]): Partial<Record<Field, number>> {
  const found: Partial<Record<Field, number>> = {};
  row.forEach((cell, index) => {
    const h = normalizeHeader(cell ?? '');
    if (!h) return;
    for (const [field, words] of HEADER_KEYWORDS) {
      if (found[field] === undefined && words.some((w) => h.includes(w))) {
        found[field] = index;
        return;
      }
    }
  });
  return found;
}

export function parseImportRows(sheet: SheetRows, courts: Court[], defaultCourtId: string | null): ParsedImport {
  // Header = first row (within the first 10) that names the accused column.
  let headerIndex = -1;
  let columns: Partial<Record<Field, number>> = {};
  for (let i = 0; i < Math.min(sheet.length, 10); i++) {
    const detected = detectColumns(sheet[i] ?? []);
    if (detected.accused_name !== undefined) {
      headerIndex = i;
      columns = detected;
      break;
    }
  }
  const hasHeader = headerIndex >= 0;
  if (!hasHeader) columns = DEFAULT_COLUMNS;

  const courtsByName = new Map(courts.map((c) => [normalizeName(c.name), c]));
  const defaultCourt = courts.find((c) => c.id === defaultCourtId) ?? null;
  const cell = (row: string[], field: Field) => {
    const index = columns[field];
    return index === undefined ? '' : String(row[index] ?? '').trim();
  };

  const rows: ImportRow[] = [];
  const seenNumbers = new Set<string>();
  let truncated = false;

  for (let i = headerIndex + 1; i < sheet.length; i++) {
    const raw = sheet[i] ?? [];
    if (raw.every((v) => !String(v ?? '').trim())) continue;
    if (rows.length >= MAX_IMPORT_ROWS) {
      truncated = true;
      break;
    }

    const row: ImportRow = {
      line: i + 1,
      accused_name: cell(raw, 'accused_name'),
      court_name: cell(raw, 'court'),
      court_id: null,
      black_case_number: cell(raw, 'black_case_number'),
      red_case_number: cell(raw, 'red_case_number'),
      note: cell(raw, 'note'),
      errors: [],
    };

    if (!row.accused_name) row.errors.push('ไม่มีชื่อผู้ถูกกล่าวหา');
    else if (row.accused_name.length > 200) row.errors.push('ชื่อยาวเกิน 200 ตัวอักษร');

    const court = row.court_name ? courtsByName.get(normalizeName(row.court_name)) : defaultCourt;
    if (!court) {
      row.errors.push(row.court_name ? `ไม่พบศาล "${row.court_name}" ในระบบ` : 'ไม่ได้ระบุศาล');
    } else if (!court.is_active) {
      row.errors.push(`ศาล "${court.name}" ถูกปิดใช้งาน`);
    } else {
      row.court_id = court.id;
      row.court_name = court.name;
    }

    for (const [field, label] of [
      ['black_case_number', 'เลขคดีดำ'],
      ['red_case_number', 'เลขคดีแดง'],
    ] as const) {
      const value = row[field];
      if (!value) continue;
      if (value.length > 50) row.errors.push(`${label}ยาวเกิน 50 ตัวอักษร`);
      else if (!CASE_NUMBER_PATTERN.test(value)) row.errors.push(`${label}มีอักขระที่ไม่อนุญาต`);
      else if (row.court_id) {
        const key = `${field}|${row.court_id}|${normalizeNumber(value)}`;
        if (seenNumbers.has(key)) row.errors.push(`${label}ซ้ำกับแถวอื่นในไฟล์`);
        seenNumbers.add(key);
      }
    }

    if (row.note.length > 2000) row.errors.push('หมายเหตุยาวเกิน 2,000 ตัวอักษร');
    rows.push(row);
  }

  return { rows, hasHeader, truncated };
}

/** UTF-8 CSV (with BOM so Excel shows Thai correctly). */
export function buildTemplateCsv(): Blob {
  const lines = [
    'ชื่อผู้ถูกกล่าวหา,ศาล,เลขคดีดำ,เลขคดีแดง,หมายเหตุ',
    'นายตัวอย่าง ทดสอบ,ศาลแขวงตัวอย่าง,อ.123/2569,,',
  ];
  return new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
}
