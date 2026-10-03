import { DateTime } from "luxon";
import { Interval, overlaps, TZ } from "./ics";

export type Member = { id: string; name: string; busy: Interval[] };

export type WorkingHours = {
  weekdays: number[];   // 1 = จันทร์ ... 7 = อาทิตย์
  startHour: number;
  endHour: number;
  breaks: { startHour: number; endHour: number }[];
};

export const DEFAULT_HOURS: WorkingHours = {
  weekdays: [1, 2, 3, 4, 5],
  startHour: 9,
  endHour: 16,
  breaks: [{ startHour: 12, endHour: 13 }],
};

export type Slot = {
  start: DateTime;
  end: DateTime;
  available: Member[];
  unavailable: Member[];
};

/** ตัดช่วงย่อยออกจากช่วงใหญ่ */
function subtract(base: Interval, cuts: Interval[]): Interval[] {
  let result: Interval[] = [base];
  for (const cut of cuts) {
    const next: Interval[] = [];
    for (const r of result) {
      if (cut.end <= r.start || cut.start >= r.end) {
        next.push(r);
        continue;
      }
      if (cut.start > r.start) next.push({ start: r.start, end: cut.start });
      if (cut.end < r.end) next.push({ start: cut.end, end: r.end });
    }
    result = next;
  }
  return result;
}

/** สร้างกรอบเวลาทำงานของแต่ละวันในช่วงที่สนใจ */
function workingWindows(
  rangeStart: DateTime,
  rangeEnd: DateTime,
  hours: WorkingHours
): Interval[] {
  const windows: Interval[] = [];
  let day = rangeStart.startOf("day");

  while (day < rangeEnd) {
    if (hours.weekdays.includes(day.weekday)) {
      const full: Interval = {
        start: day.set({ hour: hours.startHour, minute: 0 }),
        end: day.set({ hour: hours.endHour, minute: 0 }),
      };
      const cuts = hours.breaks.map((b) => ({
        start: day.set({ hour: b.startHour, minute: 0 }),
        end: day.set({ hour: b.endHour, minute: 0 }),
      }));
      windows.push(...subtract(full, cuts));
    }
    day = day.plus({ days: 1 });
  }

  return windows.filter((w) => w.end > rangeStart && w.start < rangeEnd);
}

export function findCommonSlots(opts: {
  members: Member[];
  rangeStart: DateTime;
  rangeEnd: DateTime;
  durationMin: number;
  hours?: WorkingHours;
  stepMin?: number;
  limit?: number;
}): Slot[] {
  const {
    members,
    rangeStart,
    rangeEnd,
    durationMin,
    hours = DEFAULT_HOURS,
    stepMin = 30,
    limit = 5,
  } = opts;

  const candidates: Slot[] = [];

  for (const win of workingWindows(rangeStart, rangeEnd, hours)) {
    let cursor = win.start;
    // ปัดขึ้นให้ลงตัวตามช่วงก้าว
    const offset = cursor.minute % stepMin;
    if (offset !== 0) cursor = cursor.plus({ minutes: stepMin - offset });

    while (cursor.plus({ minutes: durationMin }) <= win.end) {
      const slot: Interval = {
        start: cursor,
        end: cursor.plus({ minutes: durationMin }),
      };

      if (slot.start >= rangeStart && slot.end <= rangeEnd) {
        const available: Member[] = [];
        const unavailable: Member[] = [];

        for (const m of members) {
          const clash = m.busy.some((b) => overlaps(slot, b));
          (clash ? unavailable : available).push(m);
        }

        candidates.push({ ...slot, available, unavailable });
      }

      cursor = cursor.plus({ minutes: stepMin });
    }
  }

  // เรียง: คนว่างมากสุดก่อน แล้วค่อยเอาวันที่ใกล้กว่า
  candidates.sort((a, b) => {
    if (a.available.length !== b.available.length) {
      return b.available.length - a.available.length;
    }
    return a.start.toMillis() - b.start.toMillis();
  });

  // เลือกแบบไม่ให้ช่วงซ้อนกัน จะได้ไม่เสนอ 10:00 / 10:30 / 11:00 จากก้อนว่างเดียวกัน
  const picked: Slot[] = [];
  for (const c of candidates) {
    if (picked.some((p) => overlaps(p, c))) continue;
    picked.push(c);
    if (picked.length >= limit) break;
  }

  return picked;
}
