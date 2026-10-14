# FTPD5 – ระบบติดตามสำนวนคดี

Web Application สำหรับเจ้าหน้าที่ ใช้บันทึกเลขคดีดำ / คดีแดง ค้นหา กรองตามศาล และติดตามความคืบหน้าของสำนวน
ออกแบบแบบ Mobile First ทำงานบน GitHub Pages (Static) โดยใช้ Supabase เป็นฐานข้อมูลและระบบยืนยันตัวตน

> ⚠️ **ก่อนนำข้อมูลคดีจริงขึ้นระบบ** ต้องทำ [รายการตรวจสอบก่อนใช้งานจริง](#7-รายการตรวจสอบก่อนใช้งานจริง-ผู้ดูแลระบบต้องทำเอง) ให้ครบ
> และได้รับความเห็นชอบตามนโยบายความมั่นคงปลอดภัยของหน่วยงานและ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล

---

## 1. เทคโนโลยี

| ส่วน | เทคโนโลยี |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query 5, React Hook Form + Zod 4, Sonner, Lucide |
| Backend | Supabase PostgreSQL, Supabase Auth, Row Level Security, RPC (PL/pgSQL), Edge Function 1 ตัว (`invite-user`) |
| Deploy | GitHub Actions → GitHub Pages (HTTPS) |

## 2. โครงสร้างโปรเจกต์

```
FTPD5/
├─ .github/workflows/deploy.yml   # Lint → DB tests → Build → ตรวจ secret → Deploy
├─ public/                        # 404.html + spa-redirect.js (รองรับ refresh บน GitHub Pages), favicon
├─ scripts/
│  ├─ check-bundle-secrets.mjs    # กัน Service Role / Secret key หลุดเข้า bundle
│  └─ test-db-pglite.mjs          # รัน migrations + RLS tests บน Postgres (PGlite) แบบออฟไลน์
├─ src/
│  ├─ components/                 # AppHeader, Sidebar, BottomNavigation, StatCard, CaseCard, CourtSelector,
│  │                              # SearchInput, StatusBadge, CaseNumberInput, LoadingSkeleton, EmptyState,
│  │                              # ConfirmDialog, Sheet, ProtectedRoute, CaseDetailSheet, CaseFormSheet ...
│  ├─ hooks/                      # AuthProvider, queries (TanStack), useCaseFeedActions, useCaseFilters ...
│  ├─ layouts/                    # AppLayout (Sidebar/BottomNav), AuthLayout, navigation
│  ├─ lib/                        # supabase client, env, validation (Zod), errors, drafts, utils
│  ├─ pages/                      # Login, ForgotPassword, SetPassword, Dashboard, Record, Cases,
│  │                              # Courts, Users, Account, AuditLogs, NotFound
│  ├─ services/                   # การเรียก Supabase ทั้งหมดอยู่ที่นี่
│  ├─ styles/index.css            # Design tokens (สี/ฟอนต์/เงา/มุมโค้ง)
│  └─ types/
└─ supabase/
   ├─ migrations/                 # 0001 schema · 0002 RLS · 0003 audit · 0004 RPC
   ├─ tests/database/rls.test.sql # pgTAP 42 ข้อ (Admin / Officer / Inactive / Anonymous)
   ├─ functions/invite-user/      # Edge Function เชิญผู้ใช้ (ใช้ Service Role ฝั่ง Server เท่านั้น)
   ├─ bootstrap/first_admin.sql   # ตั้ง Admin คนแรก
   └─ config.toml                 # ค่าสำหรับ Supabase CLI (local)
```

## 3. หน้าจอ

| # | หน้า | เส้นทาง | สิทธิ์ |
| --- | --- | --- | --- |
| 1 | เข้าสู่ระบบ / ลืมรหัสผ่าน / ตั้งรหัสผ่าน | `/login`, `/forgot-password`, `/set-password` | สาธารณะ (ไม่มีสมัครสมาชิก) |
| 2 | Dashboard สถิติ 4 การ์ด + แยกตามศาล (กดการ์ดเพื่อกรอง) | `/` | ทุกคน |
| 3 | **บันทึกเลขคดีดำ/แดง** (หน้าหลักของเจ้าหน้าที่) | `/record` | ทุกคน |
| 4 | รายละเอียดสำนวน (Bottom Sheet) แก้ไข/ลบ/กู้คืน | เปิดจากหน้า 3, 5 | แก้ไขตามสิทธิ์ |
| 5 | รายการสำนวนทั้งหมด + เพิ่มสำนวน + ถังขยะ (Admin) | `/cases` | ทุกคน |
| 6 | จัดการศาล | `/courts` | Admin |
| 7 | จัดการผู้ใช้งาน (เชิญ / เปลี่ยนสิทธิ์ / เปิด-ปิดบัญชี) | `/users` | Admin |
| 8 | บัญชีผู้ใช้ (เปลี่ยนรหัสผ่าน, ประวัติการใช้งานของตนเอง) | `/account` | ทุกคน |
| + | ประวัติการแก้ไข (Audit Logs) | `/audit` | Admin |

### สถานะสำนวน
- **ครบแล้ว** = มีทั้งเลขคดีดำและคดีแดง → คำนวณจากข้อมูลจริงด้วย generated column `is_complete` (ขัดแย้งกับข้อมูลไม่ได้)
- **ยังไม่ครบ** = มีเลขไม่ครบและไม่ได้กดข้าม
- **ข้าม** = ผู้ใช้กดข้าม (`is_skipped`) แยกจากความครบถ้วน เมื่อบันทึกเลขคดีภายหลัง ระบบจะยกเลิกสถานะข้ามให้อัตโนมัติ

### สิทธิ์ (บังคับที่ฐานข้อมูล ไม่ใช่แค่ซ่อนปุ่ม)

| การกระทำ | Officer | Admin |
| --- | --- | --- |
| ดู / ค้นหา / กรองสำนวน | ✅ | ✅ (รวมถังขยะ) |
| เพิ่มสำนวน | ✅ | ✅ |
| บันทึกเลขคดี / หมายเหตุ / ข้าม | ✅ | ✅ |
| แก้ชื่อผู้ถูกกล่าวหา / ย้ายศาล | ❌ | ✅ |
| ลบ (Soft Delete) / กู้คืน | ❌ | ✅ |
| จัดการศาล / ผู้ใช้ / ดู Audit ทั้งหมด | ❌ | ✅ |

---

## 4. ติดตั้งและรันบนเครื่อง

ต้องมี Node.js 20.19+ (แนะนำ 24 LTS)

```bash
npm install
cp .env.example .env.local      # แล้วใส่ค่า Supabase URL + Publishable key
npm run dev                     # http://localhost:5173/FTPD5/
```

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run typecheck` | ตรวจ TypeScript |
| `npm run lint` | ESLint (ห้ามใช้ `dangerouslySetInnerHTML`) |
| `npm run test:db` | รัน migrations + RLS tests 42 ข้อ บน PGlite (ไม่ต้องใช้ Docker) |
| `npm run build` | Production build ไปที่ `dist/` |
| `npm run check:secrets` | สแกน `dist/` หา Secret key / service_role JWT |
| `npm run audit:deps` | ตรวจช่องโหว่ของ dependencies |

---

## 5. ตั้งค่า Supabase

### 5.1 สร้างฐานข้อมูล
1. สร้าง Project ใน Supabase (เลือก Region ใกล้ไทย เช่น Singapore)
2. รัน migrations ตามลำดับ วิธีใดวิธีหนึ่ง:
   - **Supabase CLI (แนะนำ):** `supabase link --project-ref <ref>` แล้ว `supabase db push`
   - **SQL Editor:** คัดลอกไฟล์ใน `supabase/migrations/` ไปรันทีละไฟล์ตามลำดับเลข
3. ตรวจที่ **Database > Tables** ว่าทั้ง 4 ตารางขึ้นว่า *RLS enabled*

### 5.2 ตั้งค่า Authentication (Dashboard)
| เมนู | ค่าที่ต้องตั้ง |
| --- | --- |
| Authentication > Sign In / Providers > **Allow new users to sign up** | **ปิด** (สำคัญ: ไม่มีสมัครสมาชิกเอง) |
| Authentication > Sign In / Providers > Email | เปิด Email provider, เปิด Confirm email |
| Authentication > Policies (Password) | Minimum length **12**, ต้องมีตัวพิมพ์เล็ก/ใหญ่/ตัวเลข/อักขระพิเศษ, เปิด Leaked password protection (ถ้าแพ็กเกจรองรับ) |
| Authentication > URL Configuration | Site URL = `https://USERNAME.github.io/FTPD5/` และเพิ่มใน Redirect URLs |
| Authentication > Rate Limits | ตรวจค่า sign-in / email ให้เหมาะกับหน่วยงาน |
| Authentication > Sessions | ตั้ง Time-box / Inactivity timeout ตามนโยบาย (บางค่าต้องใช้แพ็กเกจ Pro) |
| Authentication > Multi-Factor | เปิด TOTP (ดูข้อจำกัดในหัวข้อ 8) |
| Authentication > Emails > SMTP | ใช้ SMTP ของหน่วยงาน (SMTP ในตัวของ Supabase จำกัดจำนวนอีเมลต่อชั่วโมง) |

นอกจากนี้ฝั่งเว็บจะออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งานตาม `VITE_IDLE_TIMEOUT_MINUTES` (ค่าเริ่มต้น 30 นาที)

### 5.3 ตั้ง Admin คนแรก
1. Authentication > Users > **Add user** (ใส่อีเมลผู้ดูแล + ติ๊ก Auto Confirm)
2. แก้อีเมลใน `supabase/bootstrap/first_admin.sql` แล้วรันใน SQL Editor
3. เข้าสู่ระบบ แล้วเชิญผู้ใช้คนอื่นจากหน้า **จัดการผู้ใช้งาน** เท่านั้น

> บัญชีใหม่ทุกบัญชีจะเป็น `officer` + `is_active = false` โดยอัตโนมัติ ระบบไม่อ่าน role จาก user metadata

### 5.4 Deploy Edge Function สำหรับเชิญผู้ใช้
```bash
supabase functions deploy invite-user
supabase secrets set ALLOWED_ORIGINS=https://USERNAME.github.io \
                     INVITE_REDIRECT_URL=https://USERNAME.github.io/FTPD5/
```
`SUPABASE_SERVICE_ROLE_KEY` ถูกส่งให้ Edge Function โดย Supabase อัตโนมัติ **ห้ามนำไปใส่ใน `.env`, GitHub หรือโค้ด React**

### 5.5 เพิ่มศาล
เข้าสู่ระบบด้วย Admin → เมนู **จัดการศาล** → เพิ่มศาล (ระบบกันชื่อซ้ำโดยไม่สนใจตัวพิมพ์และช่องว่าง)

---

## 6. Deploy ขึ้น GitHub Pages

1. สร้าง Repository ชื่อ **`FTPD5`** แล้ว push โค้ด (branch `main`)
2. **Settings > Pages > Source** = **GitHub Actions**
3. **Settings > Secrets and variables > Actions > Variables** เพิ่ม:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (Publishable key หรือ legacy anon key)
   - `VITE_IDLE_TIMEOUT_MINUTES` (ไม่บังคับ)
4. Push ไปที่ `main` หรือกด **Run workflow** → เว็บจะอยู่ที่ `https://USERNAME.github.io/FTPD5/`

ถ้าตั้งชื่อ Repository เป็นชื่ออื่น workflow จะตั้ง base path ให้อัตโนมัติ แต่ต้องแก้ `pathSegmentsToKeep` ใน `public/404.html` เฉพาะกรณีใช้ custom domain (ตั้งเป็น `0`)

> **ค่า `VITE_*` ไม่ใช่ความลับ** ทุกค่าจะอยู่ใน JavaScript ที่ส่งให้ Browser ความปลอดภัยของข้อมูลมาจาก RLS เท่านั้น
> ถ้าใส่ Secret key / service_role key โดยไม่ตั้งใจ แอปจะไม่ยอมทำงาน และ CI จะ fail ที่ขั้นตอนตรวจ secret

---

## 7. รายการตรวจสอบก่อนใช้งานจริง (ผู้ดูแลระบบต้องทำเอง)

สิ่งที่ **ทดสอบแล้วจริง** ระหว่างพัฒนา:
- `tsc` ผ่าน, ESLint ผ่าน (0 error / 0 warning), `vite build` ผ่าน, `npm audit` พบ 0 ช่องโหว่ (ณ วันที่พัฒนา)
- Migrations ทั้ง 4 ไฟล์ + RLS tests 42 ข้อ ผ่านบน **PGlite** (Postgres จริงแบบ WASM) โดยจำลองสภาพแวดล้อม Supabase
  (roles `anon`/`authenticated`, `auth.users`, `auth.uid()`, default privileges แบบ Supabase)
- Mutation test: จงใจทำให้ policy อ่อนลง 3 แบบ (เปิด SELECT เป็น `true`, ไม่ revoke สิทธิ์ anon, ปลดการจำกัดสิทธิ์ Officer) แล้วชุดทดสอบจับได้ทุกกรณี
- Secret scanner จับ service_role JWT ปลอมได้ และไม่แจ้งเตือนผิดกับ bundle จริง

สิ่งที่ **ยังไม่ได้ทดสอบ** (ต้องทำบน Supabase Project จริงก่อนใช้งาน):

1. รัน `supabase test db` กับ stack จริง (`supabase start`) หรือรัน `supabase/tests/database/rls.test.sql` บน staging
2. **ทดสอบ REST API โดยตรง** (ไม่ผ่านหน้าเว็บ) ด้วย Publishable key:
   ```bash
   # ไม่ login: ต้องได้ 401/permission denied หรือ []
   curl "$URL/rest/v1/cases?select=*" -H "apikey: $KEY"
   # login เป็น officer แล้วลองเปลี่ยน role ตัวเอง: ต้องถูกปฏิเสธ
   curl -X PATCH "$URL/rest/v1/profiles?id=eq.<uid>" -H "apikey: $KEY" \
        -H "Authorization: Bearer $OFFICER_JWT" -H "Content-Type: application/json" -d '{"role":"admin"}'
   # officer เรียก RPC ของ admin: ต้องได้ FORBIDDEN
   curl -X POST "$URL/rest/v1/rpc/soft_delete_case" -H "apikey: $KEY" \
        -H "Authorization: Bearer $OFFICER_JWT" -H "Content-Type: application/json" -d '{"p_case_id":"<id>"}'
   # officer เรียก Edge Function: ต้องได้ 403
   curl -X POST "$URL/functions/v1/invite-user" -H "Authorization: Bearer $OFFICER_JWT" -d '{}'
   ```
3. ปิดใช้งานบัญชีทดสอบ แล้วตรวจว่าเรียกข้อมูลไม่ได้ทันที (ทั้งผ่านเว็บและ API)
4. ตรวจ **Database > Advisors (Security / Performance)** ใน Dashboard ต้องไม่มีคำเตือนระดับ ERROR
5. ทดสอบเชิญผู้ใช้ → รับอีเมล → ตั้งรหัสผ่าน → เข้าสู่ระบบ, และทดสอบลืมรหัสผ่าน
6. ทดสอบ refresh หน้าลึก เช่น `/FTPD5/cases` บน GitHub Pages ต้องไม่เกิด 404
7. ทดสอบบนมือถือจริง (iOS Safari / Android Chrome) ความกว้าง 320px ขึ้นไป และอินเทอร์เน็ตช้า
8. **สำรองและกู้คืนข้อมูล:** แพ็กเกจ Free ไม่มี Point-in-Time Recovery ให้ทำ backup เองเป็นประจำ เช่น
   `supabase db dump --data-only -f backup.sql` เก็บในที่ปลอดภัยของหน่วยงาน (**ห้าม commit ลง Git**)
   แล้วทดลองกู้คืนลง Project ทดสอบอย่างน้อย 1 ครั้ง
9. ทบทวนนโยบาย PDPA: ฐานทางกฎหมาย, ระยะเวลาเก็บ, ผู้มีสิทธิ์เข้าถึง, Region ของเซิร์ฟเวอร์ (ข้อมูลอยู่นอกประเทศ)
10. Project แพ็กเกจ Free จะถูก pause หากไม่มีการใช้งาน 7 วัน ให้วางแผนรองรับ

---

## 8. ความปลอดภัยที่ทำแล้ว และข้อจำกัดที่ทราบ

**ทำแล้ว**
- RLS เปิดทุกตาราง, revoke สิทธิ์เริ่มต้นของ Supabase ทั้งหมดแล้วให้คืนเฉพาะที่จำเป็น (column-level grants)
- ตรวจ `is_active` ในทุก policy และทุก RPC; role เก็บใน `profiles` แก้ได้ผ่าน `admin_update_user()` เท่านั้น
- กัน Admin ลดสิทธิ์/ปิดบัญชีตัวเอง และกันไม่ให้ไม่เหลือ Admin
- `SECURITY DEFINER` ทุกตัวตั้ง `search_path = ''` และ EXECUTE ให้เฉพาะ `authenticated`; helper อยู่ใน schema `private` ที่ไม่เปิดผ่าน API
- Audit log เขียนโดย trigger ในฐานข้อมูล (ปลอมจาก Frontend ไม่ได้), เป็น append-only (block UPDATE/DELETE/TRUNCATE), เก็บเฉพาะฟิลด์ที่เปลี่ยน ไม่เก็บรหัสผ่าน/token
- ค้นหาผ่าน RPC แบบ parameterized และ escape wildcard ของ LIKE
- React escape ข้อความทุกจุด + ESLint ห้าม `dangerouslySetInnerHTML` + Content-Security-Policy ใน production build
- Error message แสดงเป็นข้อความไทยทั่วไป ไม่แสดงข้อความดิบจากฐานข้อมูล; หน้า Login/ลืมรหัสผ่านไม่เปิดเผยว่าอีเมลมีบัญชีหรือไม่
- ร่างเลขคดีที่บันทึกไม่สำเร็จเก็บในหน่วยความจำ (ไม่เขียนลง localStorage) และล้างเมื่อออกจากระบบ

**ข้อจำกัด / ยังไม่ได้ทำ**
- **MFA:** เปิด TOTP ได้ที่ Supabase แต่ระบบยังไม่มีหน้าลงทะเบียน MFA และ RLS ยังไม่บังคับ `aal2` สำหรับ Admin
  ถ้านโยบายหน่วยงานกำหนด ต้องพัฒนาเพิ่ม
- GitHub Pages ตั้ง HTTP header เองไม่ได้ (เช่น `frame-ancestors`, HSTS แบบกำหนดเอง) CSP จึงใส่ผ่าน `<meta>` ซึ่งครอบคลุมไม่เท่า header
- Session token เก็บใน localStorage ตามค่าเริ่มต้นของ Supabase ถ้ามีช่องโหว่ XSS token อาจถูกขโมยได้ (ลดความเสี่ยงด้วย CSP)
- การปิดใช้งานบัญชีตัดสิทธิ์การเข้าถึงข้อมูลทันทีด้วย RLS แต่ไม่ได้ revoke session ใน Supabase Auth
  (ผู้ใช้ยัง login ได้แต่จะเห็นหน้า "บัญชียังไม่พร้อมใช้งาน")
- หน้าตา UI ออกแบบจากข้อกำหนดเป็นข้อความ เพราะไม่ได้รับภาพต้นแบบ 8 หน้าจอ ยังไม่ได้ทดสอบบนอุปกรณ์จริง
- การบันทึกพร้อมกันหลายคนในรายการเดียวกัน: ผู้บันทึกคนหลังจะเขียนทับ (มีประวัติใน Audit Log)

**ระบบนี้ยังไม่ได้ผ่านการทดสอบเจาะระบบ (Penetration Test) โดยผู้เชี่ยวชาญอิสระ ไม่ควรถือว่าปลอดภัยสมบูรณ์**
