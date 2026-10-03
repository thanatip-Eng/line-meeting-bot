import { addDays, bkk, dateKey, Interval, MIN, weekday } from "./time";

export type BusyEvent = Interval & {
  title: string;
  status: "busy" | "tentative" | "oof";
  allDay: boolean;
};

export type Settings = {
  dayStart: string; // '08:30'
  dayEnd: string; // '16:30'
  skipLunch: boolean; // ไม่เสนอ 12:00–13:00
  bufferMin: number; // เว้นก่อน–หลังนัดเดิม
  weekdaysOnly: boolean;
  particle: "ค่ะ" | "ครับ";
  teamupName: string;
};

export const DEFAULT_SETTINGS: Settings = {
  dayStart: "08:30",
  dayEnd: "16:30",
  skipLunch: true,
  bufferMin: 15,
  weekdaysOnly: true,
  particle: "ค่ะ",
  teamupName: "",
};

export type Hold = Interval & { id: string; label: string };

const GRID = 15 * MIN;
const ceilGrid = (t: number) => Math.ceil(t / GRID) * GRID;
const floorGrid = (t: number) => Math.floor(t / GRID) * GRID;

/** ลบช่วง blockers ออกจาก window คืนช่วงที่เหลือ */
export function subtract(window: Interval, blockers: Interval[]): Interval[] {
  let pieces: Interval[] = [window];
  for (const b of blockers) {
    const next: Interval[] = [];
    for (const p of pieces) {
      if (b.end <= p.start || b.start >= p.end) {
        next.push(p);
        continue;
      }
      if (b.start > p.start) next.push({ start: p.start, end: b.start });
      if (b.end < p.end) next.push({ start: b.end, end: p.end });
    }
    pieces = next;
  }
  return pieces;
}

export function blockersFor(busy: BusyEvent[], holds: Hold[], s: Settings): Interval[] {
  const buf = s.bufferMin * MIN;
  return [
    ...busy.map((e) => (e.allDay ? { start: e.start, end: e.end } : { start: e.start - buf, end: e.end + buf })),
    ...holds.map((h) => ({ start: h.start - buf, end: h.end + buf })),
  ];
}

export function workingWindow(date: string, s: Settings): Interval | null {
  if (s.weekdaysOnly && [0, 6].includes(weekday(date))) return null;
  return { start: bkk(date, s.dayStart), end: bkk(date, s.dayEnd) };
}

/** ช่วงว่างต่อเนื่องของแต่ละวันที่ยาวอย่างน้อย durationMin */
export function freeWindows(
  fromDate: string,
  toDate: string,
  durationMin: number,
  busy: BusyEvent[],
  holds: Hold[],
  s: Settings,
  now = Date.now(),
): Interval[] {
  const blockers = blockersFor(busy, holds, s);
  const out: Interval[] = [];
  for (let d = fromDate; d <= toDate; d = addDays(d, 1)) {
    const win = workingWindow(d, s);
    if (!win) continue;
    const dayBlockers = [...blockers];
    if (s.skipLunch) dayBlockers.push({ start: bkk(d, "12:00"), end: bkk(d, "13:00") });
    if (now > win.start) dayBlockers.push({ start: win.start, end: now });
    for (const p of subtract(win, dayBlockers)) {
      const iv = { start: ceilGrid(p.start), end: floorGrid(p.end) };
      if (iv.end - iv.start >= durationMin * MIN) out.push(iv);
    }
  }
  return out;
}

export function overlapping(busy: BusyEvent[], iv: Interval): BusyEvent[] {
  return busy.filter((e) => e.start < iv.end && e.end > iv.start);
}

/** หาช่องว่างใกล้ ๆ ช่วงที่ถาม (ตัดเป็นช่องยาวเท่าที่ขอ) */
export function nearbyAlternatives(
  iv: Interval,
  busy: BusyEvent[],
  holds: Hold[],
  s: Settings,
  max = 4,
): Interval[] {
  const len = iv.end - iv.start;
  const date = dateKey(iv.start);
  const windows = freeWindows(date, addDays(date, 7), Math.round(len / MIN), busy, holds, s);
  const candidates: Interval[] = [];
  for (const w of windows) {
    // ช่องแรกของ window และช่องที่ตรงเวลาเดิมถ้าอยู่ในช่วง
    candidates.push({ start: w.start, end: w.start + len });
    const sameClock = bkk(dateKey(w.start), fmtClock(iv.start));
    if (sameClock > w.start && sameClock + len <= w.end) candidates.push({ start: sameClock, end: sameClock + len });
  }
  return candidates
    .filter((c, i, arr) => arr.findIndex((x) => x.start === c.start) === i)
    .sort((a, b) => Math.abs(a.start - iv.start) - Math.abs(b.start - iv.start))
    .slice(0, max)
    .sort((a, b) => a.start - b.start);
}

function fmtClock(ms: number): string {
  return new Date(ms + 7 * 60 * MIN).toISOString().slice(11, 16);
}
