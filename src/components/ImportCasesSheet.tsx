import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from './Sheet';
import { CourtSelector } from './CourtSelector';
import { useCourts } from '@/hooks/queries';
import { importCases } from '@/services/cases';
import { readSpreadsheet } from '@/lib/spreadsheet';
import { buildTemplateCsv, MAX_IMPORT_ROWS, parseImportRows, type ParsedImport } from '@/lib/caseImport';
import { toThaiError } from '@/lib/errors';
import { cn, formatNumber } from '@/lib/utils';
import type { SheetRows } from '@/lib/spreadsheet';

interface ImportCasesSheetProps {
  open: boolean;
  onClose: () => void;
  defaultCourtId?: string | null;
}

const FILE_ERRORS: Record<string, string> = {
  FILE_TOO_LARGE: 'ไฟล์ใหญ่เกิน 10 MB',
  UNSUPPORTED_FILE: 'รองรับเฉพาะไฟล์ .xlsx หรือ .csv (ถ้าเป็น .xls ให้เปิดใน Excel แล้วบันทึกเป็น .xlsx)',
  INVALID_XLSX: 'อ่านไฟล์ Excel ไม่ได้ ไฟล์อาจเสียหายหรือมีรหัสผ่าน',
};

export function ImportCasesSheet({ open, onClose, defaultCourtId }: ImportCasesSheetProps) {
  const qc = useQueryClient();
  const { data: courts } = useCourts();
  const inputRef = useRef<HTMLInputElement>(null);

  const [courtId, setCourtId] = useState<string | null>(defaultCourtId ?? null);
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<SheetRows | null>(null);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [failedLines, setFailedLines] = useState<Array<{ line: number; message: string }>>([]);

  const parsed: ParsedImport | null = sheet && courts ? parseImportRows(sheet, courts, courtId) : null;
  const validRows = parsed?.rows.filter((r) => r.errors.length === 0) ?? [];
  const invalidRows = parsed?.rows.filter((r) => r.errors.length > 0) ?? [];
  const busy = reading || progress !== null;

  const reset = () => {
    setFileName('');
    setSheet(null);
    setFailedLines([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setFailedLines([]);
    try {
      const rows = await readSpreadsheet(file);
      setSheet(rows);
      setFileName(file.name);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      toast.error(FILE_ERRORS[code] ?? FILE_ERRORS.INVALID_XLSX);
      reset();
    } finally {
      setReading(false);
    }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(buildTemplateCsv());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'แบบฟอร์มนำเข้าสำนวน.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    if (busy || validRows.length === 0) return;
    setProgress(0);
    try {
      const result = await importCases(
        validRows.map((r) => ({
          accused_name: r.accused_name,
          court_id: r.court_id!,
          black_case_number: r.black_case_number,
          red_case_number: r.red_case_number,
          note: r.note,
        })),
        setProgress,
      );
      void qc.invalidateQueries({ queryKey: ['cases'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['court-stats'] });

      if (result.failed.length === 0) {
        toast.success(`นำเข้าสำเร็จ ${formatNumber(result.inserted)} รายการ`);
        reset();
        onClose();
      } else {
        toast.warning(
          `นำเข้าสำเร็จ ${formatNumber(result.inserted)} รายการ ไม่สำเร็จ ${formatNumber(result.failed.length)} รายการ`,
        );
        setSheet(null);
        setFailedLines(
          result.failed.map((f) => ({
            line: validRows[f.index].line,
            message: toThaiError(f.error, { duplicate: 'เลขคดีนี้มีอยู่แล้วในศาลเดียวกัน' }),
          })),
        );
      }
    } catch (err) {
      toast.error(toThaiError(err));
    } finally {
      setProgress(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="นำเข้าสำนวนจาก Excel"
      description="รองรับไฟล์ .xlsx และ .csv (อ่านเฉพาะชีตแรก)"
      locked={busy}
      size="lg"
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={close} disabled={busy}>
            {failedLines.length > 0 ? 'ปิด' : 'ยกเลิก'}
          </button>
          <button
            type="button"
            className="btn-primary flex-[2]"
            onClick={() => void runImport()}
            disabled={busy || validRows.length === 0}
          >
            {progress !== null ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {progress !== null
              ? `กำลังนำเข้า ${formatNumber(progress)}/${formatNumber(validRows.length)}`
              : `นำเข้า ${formatNumber(validRows.length)} รายการ`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-surface p-4 text-sm text-navy-800">
          <p className="font-semibold">หัวคอลัมน์ที่ระบบรู้จัก</p>
          <p className="mt-1 text-muted">
            ชื่อผู้ถูกกล่าวหา (จำเป็น) · ศาล · เลขคดีดำ · เลขคดีแดง · หมายเหตุ — ลำดับคอลัมน์ไม่สำคัญ
            ถ้าไม่มีหัวคอลัมน์ ระบบจะอ่านตามลำดับนี้ สูงสุด {formatNumber(MAX_IMPORT_ROWS)} แถวต่อครั้ง
          </p>
          <button type="button" className="btn-ghost mt-2 -ml-3" onClick={downloadTemplate}>
            <Download className="size-4" /> ดาวน์โหลดแบบฟอร์มตัวอย่าง
          </button>
        </div>

        <div>
          <label htmlFor="imp-court" className="field-label">
            ศาลเริ่มต้น (ใช้กับแถวที่ไม่ได้ระบุศาล)
          </label>
          <CourtSelector
            id="imp-court"
            courts={courts}
            value={courtId}
            onChange={setCourtId}
            allowAll={false}
            disabled={busy}
            placeholder="ไม่กำหนด — ทุกแถวต้องมีคอลัมน์ศาล"
          />
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            id="imp-file"
            onChange={(e) => void onFile(e.target.files?.[0])}
            disabled={busy}
          />
          <label
            htmlFor="imp-file"
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-line p-4 transition hover:border-brand-400',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            {reading ? (
              <LoaderCircle className="size-6 animate-spin text-muted" />
            ) : (
              <FileSpreadsheet className="size-6 text-ok-600" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-navy-900">{fileName || 'เลือกไฟล์ Excel / CSV'}</span>
              <span className="block text-sm text-muted">{fileName ? 'แตะเพื่อเลือกไฟล์ใหม่' : 'แตะเพื่อเลือกไฟล์'}</span>
            </span>
          </label>
        </div>

        {parsed && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-50 px-3 py-1.5 font-semibold text-ok-600">
                <CheckCircle2 className="size-4" /> พร้อมนำเข้า {formatNumber(validRows.length)}
              </span>
              {invalidRows.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-50 px-3 py-1.5 font-semibold text-danger-600">
                  <AlertCircle className="size-4" /> มีปัญหา {formatNumber(invalidRows.length)} (จะข้ามไป)
                </span>
              )}
            </div>
            {!parsed.hasHeader && (
              <p className="text-sm text-muted">ไม่พบหัวคอลัมน์ ระบบอ่านตามลำดับ: ชื่อ, ศาล, เลขคดีดำ, เลขคดีแดง, หมายเหตุ</p>
            )}
            {parsed.truncated && (
              <p className="text-sm text-danger-600">
                ไฟล์มีเกิน {formatNumber(MAX_IMPORT_ROWS)} แถว ระบบอ่านเฉพาะ {formatNumber(MAX_IMPORT_ROWS)} แถวแรก
              </p>
            )}
            {parsed.rows.length === 0 && <p className="text-sm text-muted">ไม่พบข้อมูลในไฟล์</p>}

            {invalidRows.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-danger-600/20 bg-danger-50/50 p-3 text-sm">
                {invalidRows.slice(0, 200).map((r) => (
                  <li key={r.line}>
                    <span className="font-semibold">แถว {r.line}</span>
                    {r.accused_name && ` (${r.accused_name})`}: {r.errors.join(', ')}
                  </li>
                ))}
              </ul>
            )}

            {validRows.length > 0 && (
              <div className="max-h-64 overflow-auto rounded-2xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface text-navy-800">
                    <tr>
                      <th className="px-3 py-2 font-semibold">แถว</th>
                      <th className="px-3 py-2 font-semibold">ชื่อผู้ถูกกล่าวหา</th>
                      <th className="px-3 py-2 font-semibold">ศาล</th>
                      <th className="px-3 py-2 font-semibold">คดีดำ</th>
                      <th className="px-3 py-2 font-semibold">คดีแดง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.slice(0, 100).map((r) => (
                      <tr key={r.line} className="border-t border-line/70">
                        <td className="px-3 py-2 text-muted">{r.line}</td>
                        <td className="px-3 py-2">{r.accused_name}</td>
                        <td className="px-3 py-2">{r.court_name}</td>
                        <td className="px-3 py-2">{r.black_case_number || '-'}</td>
                        <td className="px-3 py-2">{r.red_case_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validRows.length > 100 && (
                  <p className="border-t border-line/70 px-3 py-2 text-sm text-muted">
                    แสดง 100 แถวแรกจาก {formatNumber(validRows.length)} แถว
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {failedLines.length > 0 && (
          <div>
            <p className="field-label text-danger-600">แถวที่นำเข้าไม่สำเร็จ</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-danger-600/20 bg-danger-50/50 p-3 text-sm">
              {failedLines.map((f) => (
                <li key={f.line}>
                  <span className="font-semibold">แถว {f.line}</span>: {f.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}
