import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { PageContainer } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';

export default function NotFoundPage() {
  return (
    <PageContainer className="pt-16">
      <EmptyState
        icon={Compass}
        title="ไม่พบหน้าที่ต้องการ"
        description="ลิงก์อาจไม่ถูกต้องหรือหน้านี้ถูกย้ายแล้ว"
        action={
          <Link to="/" className="btn-primary">
            กลับหน้าหลัก
          </Link>
        }
      />
    </PageContainer>
  );
}
