import ical from "node-ical";
import { DateTime } from "luxon";

export const TZ = "Asia/Bangkok";

export type Interval = { start: DateTime; end: DateTime };

function toDT(d: Date | string) {
  return DateTime.fromJSDate(new Date(d)).setZone(TZ);
}

/** ดึงช่วงเวลาที่ไม่ว่างของคนคนหนึ่งจากลิงก์ ICS */
export async function fetchBusy(
  url: string,
  rangeStart: DateTime,
  rangeEnd: DateTime
): Promise<Interval[]> {
  const data = await ical.async.fromURL(url);
  const busy: Interval[] = [];

  for (const key of Object.keys(data)) {
    const ev: any = data[key];
    if (ev.type !== "VEVENT") continue;
    if (ev.transparency === "TRANSPARENT") continue;

    // นัดทั้งวัน = ติดทั้งวัน
    if (ev.datetype === "date") {
      const s = toDT(ev.start).startOf("day");
      const e = toDT(ev.end).startOf("day");
      if (e > rangeStart && s < rangeEnd) busy.push({ start: s, end: e });
      continue;
    }

    const durMs = new Date(ev.end).getTime() - new Date(ev.start).getTime();

    if (!ev.rrule) {
      const s = toDT(ev.start);
      const e = toDT(ev.end);
      if (e > rangeStart && s < rangeEnd) busy.push({ start: s, end: e });
      continue;
    }

    const exdates = Object.values(ev.exdate ?? {}).map((d: any) =>
      new Date(d).getTime()
    );
    for (const occ of ev.rrule.between(
      rangeStart.toJSDate(),
      rangeEnd.toJSDate(),
      true
    )) {
      if (exdates.includes(occ.getTime())) continue;
      busy.push({
        start: toDT(occ),
        end: toDT(new Date(occ.getTime() + durMs)),
      });
    }
  }

  return mergeIntervals(busy);
}

/** รวมช่วงที่ทับกันหรือติดกันให้เป็นก้อนเดียว */
export function mergeIntervals(list: Interval[]): Interval[] {
  if (list.length === 0) return [];
  const sorted = [...list].sort((a, b) => a.start.toMillis() - b.start.toMillis());
  const out: Interval[] = [sorted[0]];

  for (const cur of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (cur.start <= last.end) {
      if (cur.end > last.end) last.end = cur.end;
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

export function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}
