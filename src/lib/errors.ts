/**
 * Maps backend errors to short Thai messages. Raw database messages are never
 * shown to users (they may contain technical or personal details).
 */
interface ErrorLike {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
}

const KNOWN_MESSAGES: Record<string, string> = {
  COURT_INACTIVE: 'ศาลนี้ถูกปิดใช้งานแล้ว กรุณาเลือกศาลอื่น',
  FORBIDDEN_FIELD: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลส่วนนี้',
  CASE_LOCKED: 'สำนวนนี้กรอกเลขคดีดำและแดงครบแล้ว ถูกล็อก แก้ไขได้เฉพาะผู้ดูแลระบบ',
  FORBIDDEN: 'คุณไม่มีสิทธิ์ดำเนินการนี้',
  CANNOT_MODIFY_SELF: 'ไม่สามารถลดสิทธิ์หรือปิดใช้งานบัญชีของตนเองได้',
  LAST_ADMIN: 'ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 คน',
  NOT_FOUND: 'ไม่พบรายการ อาจถูกลบหรือเปลี่ยนแปลงแล้ว',
  INVALID_NAME: 'ชื่อไม่ถูกต้อง',
  INVALID_STATUS: 'ตัวกรองสถานะไม่ถูกต้อง',
  INVITE_FAILED: 'ไม่สามารถส่งคำเชิญได้ อีเมลนี้อาจมีบัญชีอยู่แล้ว',
  PROFILE_UPDATE_FAILED: 'ส่งคำเชิญแล้ว แต่ตั้งค่าสิทธิ์ไม่สำเร็จ กรุณาตรวจสอบในรายการผู้ใช้',
  INVALID_INPUT: 'ข้อมูลไม่ถูกต้อง',
  UNAUTHORIZED: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
};

export function toThaiError(error: unknown, context?: { duplicate?: string }): string {
  const e = (error ?? {}) as ErrorLike;
  const message = e.message ?? '';

  if (e.name === 'TypeError' || /Failed to fetch|NetworkError|network/i.test(message)) {
    return 'เชื่อมต่อเครือข่ายไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่';
  }
  if (KNOWN_MESSAGES[message]) return KNOWN_MESSAGES[message];

  switch (e.code) {
    case '23505':
      return context?.duplicate ?? 'ข้อมูลซ้ำกับรายการที่มีอยู่แล้ว';
    case '23514':
    case '22023':
    case '22P02':
      return 'ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด';
    case '23503':
      return 'ข้อมูลอ้างอิงไม่ถูกต้อง';
    case '42501':
      return 'คุณไม่มีสิทธิ์ดำเนินการนี้';
    case 'P0002':
    case 'PGRST116':
      return KNOWN_MESSAGES.NOT_FOUND;
    case 'PGRST301':
    case 'PGRST303':
      return KNOWN_MESSAGES.UNAUTHORIZED;
  }
  if (e.status === 429) return 'มีการดำเนินการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  if (e.status === 401) return KNOWN_MESSAGES.UNAUTHORIZED;
  if (e.status === 403) return KNOWN_MESSAGES.FORBIDDEN;

  return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
}

export class AppError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'AppError';
  }
}
