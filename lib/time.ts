// เวลาทั้งหมดในแอปคิดเป็นเวลาไทย (UTC+7 ไม่มี daylight saving)
export const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
export const MIN = 60 * 1000;

export type Interval = { start: number; end: number };

/** 'YYYY-MM-DD' ของเวลาไทย */
export function dateKey(ms: number): string {
  return new Date(ms + BKK_OFFSET_MS).toISOString().slice(0, 10);
}

/** สร้าง timestamp จากวันที่ 'YYYY-MM-DD' + เวลา 'HH:MM' (เวลาไทย) */
export function bkk(date: string, time = "00:00"): number {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, h, mi) - BKK_OFFSET_MS;
}

export function addDays(date: string, n: number): string {
  return dateKey(bkk(date) + n * 24 * 60 * MIN);
}

/** 0 = อาทิตย์ ... 6 = เสาร์ */
export function weekday(date: string): number {
  return new Date(bkk(date) + BKK_OFFSET_MS).getUTCDay();
}

export function todayKey(): string {
  return dateKey(Date.now());
}

export function fmtTime(ms: number): string {
  return new Date(ms + BKK_OFFSET_MS).toISOString().slice(11, 16);
}

const DAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const DAY_LONG = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const MONTH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** 'จ. 6 ต.ค. 69' */
export function thaiDateShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${DAY_SHORT[weekday(date)]} ${d} ${MONTH_SHORT[m - 1]} ${String(y + 543).slice(2)}`;
}

/** 'วันจันทร์ที่ 6 ต.ค. 2569' */
export function thaiDateLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `วัน${DAY_LONG[weekday(date)]}ที่ ${d} ${MONTH_SHORT[m - 1]} ${y + 543}`;
}

/** '09:00–12:00 น.' */
export function fmtRange(iv: Interval): string {
  const endLabel = dateKey(iv.end) !== dateKey(iv.start) && fmtTime(iv.end) === "00:00" ? "24:00" : fmtTime(iv.end);
  return `${fmtTime(iv.start)}–${endLabel} น.`;
}

/** เวลาท้องถิ่นแบบไม่มี timezone สำหรับ Outlook deeplink: '2026-10-06T09:00:00' */
export function toLocalIso(ms: number): string {
  return new Date(ms + BKK_OFFSET_MS).toISOString().slice(0, 19);
}

/** สำหรับ Teamup API: '2026-10-06T09:00:00+07:00' */
export function toOffsetIso(ms: number): string {
  return `${toLocalIso(ms)}+07:00`;
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} ชม. ${m} นาที`;
  if (h) return `${h} ชม.`;
  return `${m} นาที`;
}
