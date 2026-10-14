import { FileText, Landmark, UserRound } from 'lucide-react';
import type { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils';

const ACTION_LABELS: Record<string, string> = {
  'case.create': 'เพิ่มสำนวน',
  'case.update': 'แก้ไขสำนวน',
  'case.record_numbers': 'บันทึกเลขคดี',
  'case.skip': 'ข้ามรายการ',
  'case.unskip': 'ยกเลิกการข้าม',
  'case.delete': 'ลบสำนวน',
  'case.restore': 'กู้คืนสำนวน',
  'court.create': 'เพิ่มศาล',
  'court.update': 'แก้ไขชื่อศาล',
  'court.activate': 'เปิดใช้งานศาล',
  'court.deactivate': 'ปิดใช้งานศาล',
  'user.create': 'สร้างบัญชีผู้ใช้',
  'user.update': 'แก้ไขข้อมูลผู้ใช้',
  'user.role_change': 'เปลี่ยนสิทธิ์ผู้ใช้',
  'user.activate': 'เปิดใช้งานบัญชี',
  'user.deactivate': 'ปิดใช้งานบัญชี',
};

const FIELD_LABELS: Record<string, string> = {
  accused_name: 'ชื่อผู้ถูกกล่าวหา',
  black_case_number: 'คดีดำ',
  red_case_number: 'คดีแดง',
  note: 'หมายเหตุ',
  is_skipped: 'ข้าม',
  court_id: 'ศาล',
  sequence_number: 'ลำดับ',
  name: 'ชื่อศาล',
  is_active: 'สถานะใช้งาน',
  role: 'สิทธิ์',
  full_name: 'ชื่อ',
  email: 'อีเมล',
  deleted_at: 'ลบ',
};

// Technical or noisy keys are not shown in the summary.
const HIDDEN = new Set(['id', 'created_by', 'updated_by', 'deleted_by', 'court_id', 'deleted_at']);

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'ใช่' : 'ไม่';
  if (value === 'admin') return 'ผู้ดูแลระบบ';
  if (value === 'officer') return 'เจ้าหน้าที่';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

const ICONS = { case: FileText, court: Landmark, user: UserRound };

export function AuditLogItem({ log }: { log: AuditLog }) {
  const Icon = ICONS[log.entity_type] ?? FileText;
  const changes = Object.entries(log.new_values ?? {})
    .filter(([k]) => !HIDDEN.has(k) && FIELD_LABELS[k])
    .slice(0, 5);

  return (
    <li className="card flex gap-3 p-4 animate-fade-up">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-navy-900/6 text-navy-700">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="font-bold">{ACTION_LABELS[log.action] ?? log.action}</p>
          <time className="text-xs text-muted" dateTime={log.created_at}>
            {formatDateTime(log.created_at)}
          </time>
        </div>
        <p className="text-sm text-muted">โดย {log.actor_name || (log.actor_id ? 'ผู้ใช้' : 'ระบบ')}</p>
        {changes.length > 0 && (
          <ul className="mt-2 space-y-0.5 rounded-xl bg-surface px-3 py-2 text-sm">
            {changes.map(([k, v]) => (
              <li key={k} className="break-words">
                <span className="text-muted">{FIELD_LABELS[k]}: </span>
                {log.old_values && k in log.old_values && (
                  <>
                    <span className="text-slate-400 line-through">{display(log.old_values[k])}</span>
                    <span className="mx-1 text-muted">→</span>
                  </>
                )}
                <span className="font-semibold">{display(v)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
