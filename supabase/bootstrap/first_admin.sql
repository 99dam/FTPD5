-- =====================================================================
-- FTPD5 – ตั้งผู้ดูแลระบบคนแรก (รันครั้งเดียว)
--
-- 1) Supabase Dashboard > Authentication > Users > "Add user"
--    สร้างผู้ใช้ด้วยอีเมลของผู้ดูแลระบบ (ติ๊ก Auto Confirm User)
-- 2) เปิด SQL Editor แล้วแก้อีเมล/ชื่อด้านล่าง จากนั้นกด Run
--
-- หลังจากนี้ ให้เชิญผู้ใช้คนอื่นผ่านหน้า "จัดการผู้ใช้งาน" ในระบบเท่านั้น
-- =====================================================================
update public.profiles
   set role = 'admin',
       is_active = true,
       full_name = 'ชื่อ นามสกุล ผู้ดูแลระบบ'
 where email = 'admin@example.go.th';

-- ตรวจสอบผลลัพธ์ (ต้องได้ 1 แถว role = admin, is_active = true)
select id, email, full_name, role, is_active from public.profiles where role = 'admin';
