import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, LogIn, Mail } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { PasswordInput } from '@/components/PasswordInput';
import { supabase } from '@/lib/supabase';
import { loginSchema, type LoginValues } from '@/lib/validation';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    });
    if (authError) {
      // Generic message: never reveal whether the account exists.
      setError(
        authError.status === 429
          ? 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
          : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      );
      return;
    }
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from !== '/login' ? from : '/', { replace: true });
  };

  return (
    <AuthLayout title="เข้าสู่ระบบ" subtitle="กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับจากผู้ดูแลระบบ">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="field-label">
            อีเมล
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="name@agency.go.th"
              className="field pl-12"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-semibold text-navy-800">
              รหัสผ่าน
            </label>
            <Link to="/forgot-password" className="text-sm font-semibold text-brand-500 hover:text-brand-600">
              ลืมรหัสผ่าน?
            </Link>
          </div>
          <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary min-h-13 w-full text-base" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="size-5 animate-spin" /> : <LogIn className="size-5" />}
          {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </AuthLayout>
  );
}
