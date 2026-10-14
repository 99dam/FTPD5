import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/layouts/AuthLayout';
import { PasswordInput } from '@/components/PasswordInput';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toThaiError } from '@/lib/errors';
import { newPasswordSchema, type NewPasswordValues } from '@/lib/validation';

/** Landing page for invite and password-recovery links. */
export default function SetPasswordPage() {
  const { session, loading, completePasswordSetup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: '', confirm: '' } });

  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;

  const onSubmit = async ({ password }: NewPasswordValues) => {
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(
        updateError.code === 'same_password'
          ? 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'
          : updateError.code === 'weak_password'
            ? 'รหัสผ่านไม่ปลอดภัยพอ กรุณาตั้งรหัสผ่านที่คาดเดายากขึ้น'
            : toThaiError(updateError),
      );
      return;
    }
    completePasswordSetup();
    toast.success('ตั้งรหัสผ่านเรียบร้อยแล้ว');
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout title="ตั้งรหัสผ่านใหม่" subtitle="อย่างน้อย 12 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="new-password" className="field-label">
            รหัสผ่านใหม่
          </label>
          <PasswordInput id="new-password" autoComplete="new-password" {...register('password')} />
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </div>
        <div>
          <label htmlFor="confirm-password" className="field-label">
            ยืนยันรหัสผ่านใหม่
          </label>
          <PasswordInput id="confirm-password" autoComplete="new-password" {...register('confirm')} />
          {errors.confirm && <p className="field-error">{errors.confirm.message}</p>}
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary min-h-13 w-full" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="size-5 animate-spin" /> : <KeyRound className="size-5" />}
          บันทึกรหัสผ่าน
        </button>
      </form>
    </AuthLayout>
  );
}
