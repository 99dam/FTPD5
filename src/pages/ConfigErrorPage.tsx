import { Settings } from 'lucide-react';
import { Logo } from '@/components/Logo';

/** Shown when the build has no Supabase settings (or a secret key by mistake). */
export function ConfigErrorPage({ secretDetected }: { secretDetected: boolean }) {
  return (
    <div className="header-gradient grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md">
        <Logo size="md" className="mb-6 justify-center" />
        <div className="card p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-brand-50 text-brand-500">
            <Settings className="size-7" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-extrabold">ระบบยังไม่พร้อมใช้งาน</h1>
          <p className="mt-2 text-sm text-muted">
            {secretDetected
              ? 'ตรวจพบการตั้งค่าที่ไม่ปลอดภัย ระบบหยุดทำงานเพื่อป้องกันข้อมูล กรุณาแจ้งผู้ดูแลระบบ'
              : 'ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล กรุณาแจ้งผู้ดูแลระบบ'}
          </p>
        </div>
      </div>
    </div>
  );
}
