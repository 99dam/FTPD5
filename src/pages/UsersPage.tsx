import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Power, RefreshCw, Send, ShieldCheck, UserPlus, UserRound, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader, PageContainer } from '@/components/AppHeader';
import { SearchInput } from '@/components/SearchInput';
import { Sheet } from '@/components/Sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { ActiveBadge, RoleBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/queries';
import { adminUpdateUser, inviteUser } from '@/services/users';
import { inviteSchema, type InviteValues } from '@/lib/validation';
import { toThaiError } from '@/lib/errors';
import { cn, formatNumber, initials } from '@/lib/utils';
import type { Profile, Role } from '@/types';

type PendingChange = { user: Profile; change: { role: Role } | { is_active: boolean } } | null;

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: me, isAdmin } = useAuth();
  const users = useUsers(isAdmin);
  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState(false);
  const [pending, setPending] = useState<PendingChange>(null);

  const term = search.trim().toLowerCase();
  const list = (users.data ?? []).filter(
    (u) => !term || u.full_name.toLowerCase().includes(term) || (u.email ?? '').toLowerCase().includes(term),
  );

  const update = useMutation({
    mutationFn: (p: NonNullable<PendingChange>) => adminUpdateUser(p.user.id, p.change),
    onSuccess: () => {
      toast.success('บันทึกการเปลี่ยนแปลงแล้ว');
      setPending(null);
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(toThaiError(err)),
  });

  const describe = (p: NonNullable<PendingChange>) =>
    'role' in p.change
      ? `เปลี่ยนสิทธิ์ของ “${p.user.full_name || p.user.email}” เป็น ${p.change.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}?`
      : p.change.is_active
        ? `เปิดใช้งานบัญชี “${p.user.full_name || p.user.email}”?`
        : `ปิดใช้งานบัญชี “${p.user.full_name || p.user.email}”? ผู้ใช้จะเข้าถึงข้อมูลไม่ได้ทันที`;

  return (
    <>
      <AppHeader
        title="จัดการผู้ใช้งาน"
        subtitle={`ทั้งหมด ${formatNumber(users.data?.length ?? 0)} บัญชี`}
        actions={
          <button type="button" className="btn-primary" onClick={() => setInviting(true)}>
            <UserPlus className="size-5" />
            <span className="hidden sm:inline">เชิญผู้ใช้</span>
            <span className="sm:hidden">เชิญ</span>
          </button>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อหรืออีเมล" onDark className="sm:max-w-md" />
      </AppHeader>

      <PageContainer className="mt-5">
        {users.isPending ? (
          <ListSkeleton count={4} compact />
        ) : users.isError ? (
          <EmptyState
            icon={RefreshCw}
            title="โหลดข้อมูลไม่สำเร็จ"
            description={toThaiError(users.error)}
            action={
              <button type="button" className="btn-secondary" onClick={() => void users.refetch()}>
                ลองใหม่
              </button>
            }
          />
        ) : list.length === 0 ? (
          <EmptyState icon={Users} title="ไม่พบผู้ใช้" />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((u) => {
              const self = u.id === me?.id;
              return (
                <li key={u.id} className={cn('card p-4 animate-fade-up', !u.is_active && 'opacity-75')}>
                  <div className="flex items-start gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-navy-900 font-bold text-white">
                      {initials(u.full_name || u.email)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold break-words">
                        {u.full_name || '—'} {self && <span className="text-xs font-semibold text-brand-500">(คุณ)</span>}
                      </p>
                      <p className="truncate text-sm text-muted">{u.email}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <RoleBadge role={u.role} />
                        <ActiveBadge active={u.is_active} />
                      </div>
                    </div>
                  </div>

                  {!self && (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary min-h-10 flex-1 text-sm"
                        onClick={() => setPending({ user: u, change: { role: u.role === 'admin' ? 'officer' : 'admin' } })}
                      >
                        {u.role === 'admin' ? <UserRound className="size-4" /> : <ShieldCheck className="size-4" />}
                        {u.role === 'admin' ? 'เปลี่ยนเป็นเจ้าหน้าที่' : 'เปลี่ยนเป็นผู้ดูแล'}
                      </button>
                      <button
                        type="button"
                        className={cn('btn-secondary min-h-10 flex-1 text-sm', u.is_active ? 'text-danger-600' : 'text-ok-600')}
                        onClick={() => setPending({ user: u, change: { is_active: !u.is_active } })}
                      >
                        <Power className="size-4" />
                        {u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PageContainer>

      <InviteSheet open={inviting} onClose={() => setInviting(false)} />

      <ConfirmDialog
        open={Boolean(pending)}
        tone={pending && 'is_active' in pending.change && !pending.change.is_active ? 'danger' : 'primary'}
        title="ยืนยันการเปลี่ยนแปลง"
        description={pending ? describe(pending) : ''}
        loading={update.isPending}
        onConfirm={() => pending && update.mutate(pending)}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', full_name: '', role: 'officer' },
  });
  const { errors } = formState;

  const mutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: (_d, v) => {
      toast.success(`ส่งคำเชิญไปที่ ${v.email} แล้ว`);
      reset();
      void qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err) => toast.error(toThaiError(err)),
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      locked={mutation.isPending}
      title="เชิญผู้ใช้งานใหม่"
      description="ผู้ใช้จะได้รับอีเมลเพื่อตั้งรหัสผ่าน ไม่มีการสมัครสมาชิกสาธารณะ"
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((v) => {
          if (!mutation.isPending) mutation.mutate(v);
        })}
      >
        <div>
          <label htmlFor="inv-name" className="field-label">
            ชื่อ-นามสกุล <span className="text-danger-600">*</span>
          </label>
          <input id="inv-name" className="field" maxLength={120} {...register('full_name')} />
          {errors.full_name && <p className="field-error">{errors.full_name.message}</p>}
        </div>
        <div>
          <label htmlFor="inv-email" className="field-label">
            อีเมล <span className="text-danger-600">*</span>
          </label>
          <input id="inv-email" type="email" autoCapitalize="none" className="field" {...register('email')} />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>
        <fieldset>
          <legend className="field-label">สิทธิ์การใช้งาน</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['officer', 'admin'] as const).map((r) => (
              <label
                key={r}
                className="flex min-h-12 cursor-pointer items-center gap-2 rounded-[14px] border border-line px-4 font-semibold has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
              >
                <input type="radio" value={r} className="accent-brand-500" {...register('role')} />
                {r === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          ส่งคำเชิญ
        </button>
      </form>
    </Sheet>
  );
}
