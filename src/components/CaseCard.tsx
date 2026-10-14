import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Check, Info, Landmark, LoaderCircle, Lock, Save, SkipForward, Undo2 } from 'lucide-react';
import type { CaseRow } from '@/types';
import { caseNumberSchema } from '@/lib/validation';
import { getDraft, setDraft } from '@/lib/drafts';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatSequence } from '@/lib/utils';
import { CaseNumberInput } from './CaseNumberInput';
import { StatusBadge } from './StatusBadge';

interface CaseCardProps {
  row: CaseRow;
  saving: boolean;
  justSaved: boolean;
  onSave: (row: CaseRow, black: string, red: string) => void;
  onSkip: (row: CaseRow) => void;
  onUnskip: (row: CaseRow) => void;
  onOpenDetail: (row: CaseRow) => void;
}

function fieldError(value: string): string | undefined {
  const r = caseNumberSchema.safeParse(value);
  return r.success ? undefined : r.error.issues[0]?.message;
}

const normalise = (v: string | null | undefined) => (v ?? '').trim().replace(/\s+/g, ' ');

/**
 * Inline entry card on the record page: officers type the black and/or red
 * case number and save straight from the card. Typed values are kept as a
 * draft until the server confirms the save.
 */
export function CaseCard({ row, saving, justSaved, onSave, onSkip, onUnskip, onOpenDetail }: CaseCardProps) {
  const { isAdmin } = useAuth();
  // Both numbers recorded: locked for officers (the database enforces this too).
  const locked = row.is_complete && !isAdmin;
  const draft = locked ? undefined : getDraft(row.id);
  const [black, setBlack] = useState(draft?.black ?? row.black_case_number ?? '');
  const [red, setRed] = useState(draft?.red ?? row.red_case_number ?? '');
  const [touched, setTouched] = useState(false);
  const redRef = useRef<HTMLInputElement>(null);

  const blackError = touched ? fieldError(black) : undefined;
  const redError = touched ? fieldError(red) : undefined;
  const dirty =
    normalise(black) !== normalise(row.black_case_number) || normalise(red) !== normalise(row.red_case_number);
  const seq = formatSequence(row.sequence_number);

  const update = (nextBlack: string, nextRed: string) => {
    setBlack(nextBlack);
    setRed(nextRed);
    setDraft(row.id, { black: nextBlack, red: nextRed });
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    setTouched(true);
    if (locked || saving || !dirty || fieldError(black) || fieldError(red)) return;
    onSave(row, black, red);
  };

  const onBlackKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) submit();
      else redRef.current?.focus();
    }
  };

  return (
    <article
      id={`case-${row.id}`}
      className={cn(
        'card relative scroll-mt-28 overflow-hidden p-4 transition-shadow animate-fade-up sm:p-5',
        justSaved && 'ring-2 ring-ok-500',
      )}
      aria-label={`รายการ ${seq} ${row.accused_name}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-navy-900 text-[15px] font-extrabold text-white tabular-nums">
          {seq}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted">FTPD5 — รายการ {seq}</p>
          <h3 className="text-[17px] leading-snug font-bold break-words">{row.accused_name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
            <Landmark className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{row.court_name}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge row={row} />
          <button
            type="button"
            onClick={() => onOpenDetail(row)}
            className="btn-icon size-9 text-muted hover:bg-slate-100"
            aria-label="ดูรายละเอียด"
          >
            <Info className="size-5" />
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <CaseNumberInput
            kind="black"
            id={`black-${row.id}`}
            value={black}
            onChange={(e) => update(e.target.value, red)}
            onKeyDown={onBlackKeyDown}
            enterKeyHint="next"
            error={blackError}
            disabled={saving || locked}
          />
          <CaseNumberInput
            ref={redRef}
            kind="red"
            id={`red-${row.id}`}
            value={red}
            onChange={(e) => update(black, e.target.value)}
            enterKeyHint="done"
            error={redError}
            disabled={saving || locked}
          />
        </div>

        {locked ? (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-ok-50 px-4 py-3 text-sm font-semibold text-ok-600">
            <Lock className="size-4 shrink-0" aria-hidden />
            กรอกครบแล้ว ล็อกการแก้ไข (แก้ได้เฉพาะผู้ดูแลระบบ)
          </p>
        ) : (
        <div className="mt-4 flex gap-2">
          {row.is_skipped && !row.is_complete ? (
            <button type="button" className="btn-muted flex-1" onClick={() => onUnskip(row)} disabled={saving}>
              <Undo2 className="size-4" />
              ยกเลิกข้าม
            </button>
          ) : (
            <button
              type="button"
              className="btn-muted flex-1"
              onClick={() => onSkip(row)}
              disabled={saving || row.is_complete}
            >
              <SkipForward className="size-4" />
              ข้าม
            </button>
          )}
          <button type="submit" className="btn-primary flex-[2]" disabled={saving || !dirty}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
        )}
      </form>

      {justSaved && (
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-[1px] animate-fade-up"
          role="status"
        >
          <span className="flex flex-col items-center gap-2">
            <span className="grid size-16 place-items-center rounded-full bg-ok-500 text-white shadow-lg animate-pop">
              <Check className="size-9" strokeWidth={3} />
            </span>
            <span className="text-sm font-bold text-ok-600">บันทึกแล้ว</span>
          </span>
        </div>
      )}
    </article>
  );
}
