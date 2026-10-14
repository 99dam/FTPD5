import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, LoaderCircle, Mail, MailCheck, Send } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { supabase } from '@/lib/supabase';
import { emailOnlySchema, type EmailOnlyValues } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyValues>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } });

  const onSubmit = async ({ email }: EmailOnlyValues) => {
    // The recovery link returns to the app root; the app then routes to /set-password.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    });
    // Always show the same result so the page cannot be used to probe accounts.
    setSent(true);
  };

  return (
    <AuthLayout title="ลืมรหัสผ่าน" subtitle="ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณ">
      {sent ? (
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-ok-50 text-ok-600">
            <MailCheck className="size-7" aria-hidden />
          </span>
          <p className="mt-4 text-[15px]">
            หากอีเมลนี้มีบัญชีในระบบ คุณจะได้รับลิงก์สำหรับตั้งรหัสผ่านใหม่ภายในไม่กี่นาที
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="field-label">
              อีเมล
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
              <input id="email" type="email" autoComplete="username" className="field pl-12" {...register('email')} />
            </div>
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
          <button type="submit" className="btn-primary min-h-13 w-full" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}
            ส่งลิงก์ตั้งรหัสผ่าน
          </button>
        </form>
      )}
      <Link to="/login" className="btn-ghost mt-4 w-full">
        <ArrowLeft className="size-4" />
        กลับไปหน้าเข้าสู่ระบบ
      </Link>
    </AuthLayout>
  );
}
