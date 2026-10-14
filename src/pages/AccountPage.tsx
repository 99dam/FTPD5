import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight, History, KeyRound, Landmark, LoaderCircle, LogOut, Mail, Pencil, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader, PageContainer } from '@/components/AppHeader';
import { Sheet } from '@/components/Sheet';
import { PasswordInput } from '@/components/PasswordInput';
import { AuditLogItem } from '@/components/AuditLogItem';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { Pagination } from '@/components/Pagination';
import { ActiveBadge, RoleBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLogs } from '@/hooks/queries';
import { updateMyProfile } from '@/services/users';
import { supabase } from '@/lib/supabase';
import { toThaiError } from '@/lib/errors';
import { initials } from '@/lib/utils';
import {
  newPasswordSchema,
  profileNameSchema,
  type NewPasswordValues,
  type ProfileNameValues,
} from '@/lib/validation';

const HISTORY_PAGE_SIZE = 10;

export default function AccountPage() {
  const { profile, user, isAdmin, signOut, refreshProfile } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [page, setPage] = useState(1);
  const history = useAuditLogs(null, user?.id ?? null, page, HISTORY_PAGE_SIZE);

  return (
    <>
      <AppHeader title="บัญชีผู้ใช้" subtitle="ข้อมูลส่วนตัวและความปลอดภัย" />

      <PageContainer className="mt-5 grid gap-5 lg:grid-cols-[380px_1fr] lg:items-start">
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="header-gradient h-20" aria-hidden />
            <div className="-mt-10 px-5 pb-5">
              <span className="grid size-20 place-items-center rounded-full bg-brand-500 text-2xl font-extrabold text-white ring-4 ring-white">
                {initials(profile?.full_name)}
              </span>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold break-words">{profile?.full_name || '—'}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                    <Mail className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{user?.email}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-icon text-navy-700 hover:bg-slate-100"
                  onClick={() => setEditingName(true)}
                  aria-label="แก้ไขชื่อ"
                >
                  <Pencil className="size-[18px]" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile && <RoleBadge role={profile.role} />}
                {profile && <ActiveBadge active={profile.is_active} />}
              </div>
            </div>
          </section>

          <nav className="card divide-y divide-line overflow-hidden" aria-label="การตั้งค่าบัญชี">
            <MenuButton icon={KeyRound} label="เปลี่ยนรหัสผ่าน" onClick={() => setChangingPassword(true)} />
            {isAdmin && (
              <>
                <MenuLink icon={Users} label="จัดการผู้ใช้งาน" to="/users" />
                <MenuLink icon={Landmark} label="จัดการศาล" to="/courts" />
                <MenuLink icon={History} label="ประวัติการแก้ไขทั้งหมด" to="/audit" />
              </>
            )}
          </nav>

          <button type="button" className="btn-secondary w-full text-danger-600" onClick={() => void signOut()}>
            <LogOut className="size-5" />
            ออกจากระบบ
          </button>
        </div>

        <section aria-labelledby="history-title">
          <h2 id="history-title" className="mb-3 flex items-center gap-2 text-lg font-extrabold">
            <History className="size-5 text-brand-500" aria-hidden />
            ประวัติการใช้งานของฉัน
          </h2>
          {history.isPending ? (
            <ListSkeleton count={3} compact />
          ) : history.isError ? (
            <EmptyState title="โหลดประวัติไม่สำเร็จ" description={toThaiError(history.error)} />
          ) : history.data.rows.length === 0 ? (
            <EmptyState icon={History} title="ยังไม่มีประวัติการใช้งาน" />
          ) : (
            <>
              <ul className="space-y-3">
                {history.data.rows.map((log) => (
                  <AuditLogItem key={log.id} log={log} />
                ))}
              </ul>
              <Pagination page={page} pageSize={HISTORY_PAGE_SIZE} total={history.data.total} onChange={setPage} />
            </>
          )}
        </section>
      </PageContainer>

      <Sheet open={editingName} onClose={() => setEditingName(false)} title="แก้ไขชื่อที่แสดง">
        {editingName && (
          <NameForm
            initial={profile?.full_name ?? ''}
            onDone={() => {
              setEditingName(false);
              void refreshProfile();
            }}
          />
        )}
      </Sheet>

      <Sheet open={changingPassword} onClose={() => setChangingPassword(false)} title="เปลี่ยนรหัสผ่าน">
        {changingPassword && <PasswordForm onDone={() => setChangingPassword(false)} />}
      </Sheet>
    </>
  );
}

function MenuButton({ icon: Icon, label, onClick }: { icon: typeof KeyRound; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 px-5 text-left font-semibold hover:bg-surface">
      <Icon className="size-5 text-brand-500" aria-hidden />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-5 text-slate-300" aria-hidden />
    </button>
  );
}

function MenuLink({ icon: Icon, label, to }: { icon: typeof KeyRound; label: string; to: string }) {
  return (
    <Link to={to} className="flex min-h-14 items-center gap-3 px-5 font-semibold hover:bg-surface">
      <Icon className="size-5 text-brand-500" aria-hidden />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-5 text-slate-300" aria-hidden />
    </Link>
  );
}

function NameForm({ initial, onDone }: { initial: string; onDone: () => void }) {
  const { register, handleSubmit, formState } = useForm<ProfileNameValues>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { full_name: initial },
  });
  const mutation = useMutation({
    mutationFn: (v: ProfileNameValues) => updateMyProfile(v.full_name),
    onSuccess: () => {
      toast.success('บันทึกชื่อแล้ว');
      onDone();
    },
    onError: (err) => toast.error(toThaiError(err)),
  });
  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit((v) => !mutation.isPending && mutation.mutate(v))}>
      <div>
        <label htmlFor="my-name" className="field-label">
          ชื่อ-นามสกุล
        </label>
        <input id="my-name" className="field" maxLength={120} {...register('full_name')} />
        {formState.errors.full_name && <p className="field-error">{formState.errors.full_name.message}</p>}
      </div>
      <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        บันทึก
      </button>
    </form>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const { register, handleSubmit, formState } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });
  const mutation = useMutation({
    mutationFn: async ({ password }: NewPasswordValues) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('เปลี่ยนรหัสผ่านแล้ว');
      onDone();
    },
    onError: (err: { code?: string }) =>
      toast.error(
        err.code === 'reauthentication_needed'
          ? 'กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน'
          : err.code === 'same_password'
            ? 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'
            : toThaiError(err),
      ),
  });
  const { errors } = formState;
  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit((v) => !mutation.isPending && mutation.mutate(v))}>
      <p className="text-sm text-muted">อย่างน้อย 12 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ</p>
      <div>
        <label htmlFor="pw-new" className="field-label">
          รหัสผ่านใหม่
        </label>
        <PasswordInput id="pw-new" autoComplete="new-password" {...register('password')} />
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </div>
      <div>
        <label htmlFor="pw-confirm" className="field-label">
          ยืนยันรหัสผ่านใหม่
        </label>
        <PasswordInput id="pw-confirm" autoComplete="new-password" {...register('confirm')} />
        {errors.confirm && <p className="field-error">{errors.confirm.message}</p>}
      </div>
      <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        เปลี่ยนรหัสผ่าน
      </button>
    </form>
  );
}
