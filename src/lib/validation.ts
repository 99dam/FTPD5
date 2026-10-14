import { z } from 'zod';

// Mirrors the CHECK constraints in supabase/migrations (validated on both sides).
export const CASE_NUMBER_PATTERN = /^[ก-๙A-Za-z0-9./() -]*$/;

export const caseNumberSchema = z
  .string()
  .trim()
  .max(50, 'ไม่เกิน 50 ตัวอักษร')
  .regex(CASE_NUMBER_PATTERN, 'ใช้ได้เฉพาะตัวอักษร ตัวเลข และ . / - ( )');

export const caseFormSchema = z.object({
  accused_name: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกชื่อผู้ถูกกล่าวหา')
    .max(200, 'ไม่เกิน 200 ตัวอักษร'),
  court_id: z.string().min(1, 'กรุณาเลือกศาลที่พิพากษา'),
  black_case_number: caseNumberSchema,
  red_case_number: caseNumberSchema,
  note: z.string().trim().max(2000, 'ไม่เกิน 2,000 ตัวอักษร'),
});
export type CaseFormValues = z.infer<typeof caseFormSchema>;

export const caseNumbersSchema = z.object({
  black_case_number: caseNumberSchema,
  red_case_number: caseNumberSchema,
});

export const courtFormSchema = z.object({
  name: z.string().trim().min(2, 'อย่างน้อย 2 ตัวอักษร').max(150, 'ไม่เกิน 150 ตัวอักษร'),
});
export type CourtFormValues = z.infer<typeof courtFormSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'กรุณากรอกอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน').max(128),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const emailOnlySchema = z.object({
  email: z.string().trim().min(1, 'กรุณากรอกอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง'),
});
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>;

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, 'อย่างน้อย 12 ตัวอักษร')
      .max(72, 'ไม่เกิน 72 ตัวอักษร')
      .regex(/[a-z]/, 'ต้องมีตัวพิมพ์เล็ก (a-z)')
      .regex(/[A-Z]/, 'ต้องมีตัวพิมพ์ใหญ่ (A-Z)')
      .regex(/[0-9]/, 'ต้องมีตัวเลข')
      .regex(/[^A-Za-z0-9]/, 'ต้องมีอักขระพิเศษ'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'รหัสผ่านไม่ตรงกัน' });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

export const inviteSchema = z.object({
  email: z.string().trim().min(1, 'กรุณากรอกอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง').max(320),
  full_name: z.string().trim().min(1, 'กรุณากรอกชื่อ-นามสกุล').max(120),
  role: z.enum(['admin', 'officer']),
});
export type InviteValues = z.infer<typeof inviteSchema>;

export const profileNameSchema = z.object({
  full_name: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(120, 'ไม่เกิน 120 ตัวอักษร'),
});
export type ProfileNameValues = z.infer<typeof profileNameSchema>;
