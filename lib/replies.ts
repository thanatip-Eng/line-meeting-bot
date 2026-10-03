import { dateKey, fmtDuration, fmtRange, Interval, thaiDateLong, thaiDateShort, toLocalIso } from "./time";
import type { Settings } from "./slots";

export function freeReply(iv: Interval, s: Settings): string {
  return `ว่าง${s.particle} ${thaiDateLong(dateKey(iv.start))} เวลา ${fmtRange(iv)} ลงนัดได้เลย${s.particle}`;
}

export function busyReply(iv: Interval, alts: Interval[], s: Settings): string {
  const head = `ขออภัย${s.particle} ${thaiDateLong(dateKey(iv.start))} เวลา ${fmtRange(iv)} ติดภารกิจแล้ว${s.particle}`;
  if (!alts.length) return `${head} รบกวนเสนอวันเวลาอื่นได้ไหม${s.particle}`;
  return [head, "ช่วงที่ว่างใกล้เคียง:", ...alts.map(slotLine), `สะดวกช่วงไหนแจ้งได้เลย${s.particle}`].join("\n");
}

export function proposeReply(slots: Interval[], durationMin: number, s: Settings): string {
  return [`ช่วงเวลาที่ว่าง${s.particle} (สำหรับนัด ${fmtDuration(durationMin)})`, ...slots.map(slotLine), `สะดวกช่วงไหนแจ้งได้เลย${s.particle}`].join(
    "\n",
  );
}

/** ข้อความสำหรับส่งให้ Claude in Chrome กรอก Teamup แทน (ทางสำรอง) */
export function teamupText(slots: Interval[], name: string, link: string): string {
  return [
    `ช่วยเพิ่ม event ใน Teamup นี้: ${link}`,
    `ชื่อ event: ${name || "(ชื่อของฉัน)"} — 1 ช่วงเวลาต่อ 1 event`,
    "ช่วงเวลาว่าง:",
    ...slots.map(slotLine),
  ].join("\n");
}

export function slotLine(iv: Interval): string {
  return `• ${thaiDateShort(dateKey(iv.start))}  ${fmtRange(iv)}`;
}

/** ฟอร์มลงนัดของ Outlook บนเว็บ (ทดสอบแล้วว่าใช้ได้กับบัญชี Office 365) */
export function outlookComposeUrl(iv: Interval, subject: string, location = ""): string {
  const p = new URLSearchParams({
    subject,
    startdt: toLocalIso(iv.start),
    enddt: toLocalIso(iv.end),
  });
  if (location) p.set("location", location);
  return `https://outlook.office.com/calendar/deeplink/compose?${p.toString()}`;
}
