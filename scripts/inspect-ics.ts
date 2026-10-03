import ical from "node-ical";
import { DateTime } from "luxon";

const TZ = "Asia/Bangkok";
const DAYS_AHEAD = 14;

const url = process.env.TEST_ICS_URL;
if (!url) throw new Error("ยังไม่ได้ใส่ TEST_ICS_URL");

const rangeStart = DateTime.now().setZone(TZ).startOf("day");
const rangeEnd = rangeStart.plus({ days: DAYS_AHEAD });

type Busy = { start: DateTime; end: DateTime; recurring: boolean };

function toDT(d: Date | string) {
  return DateTime.fromJSDate(new Date(d)).setZone(TZ);
}

async function main() {
  const data = await ical.async.fromURL(url!);
  const busy: Busy[] = [];
  let skipped = 0;

  for (const key of Object.keys(data)) {
    const ev: any = data[key];
    if (ev.type !== "VEVENT") continue;

    // นัดที่ตั้งสถานะเป็น "ว่าง" ไม่นับว่าติด
    if (ev.transparency === "TRANSPARENT") { skipped++; continue; }

    const durMs = new Date(ev.end).getTime() - new Date(ev.start).getTime();

    if (!ev.rrule) {
      const s = toDT(ev.start);
      const e = toDT(ev.end);
      if (e > rangeStart && s < rangeEnd) {
        busy.push({ start: s, end: e, recurring: false });
      }
      continue;
    }

    // กางนัดที่เกิดซ้ำออกเป็นรายครั้ง
    const exdates = Object.values(ev.exdate ?? {}).map((d: any) =>
      new Date(d).getTime()
    );
    const occurrences = ev.rrule.between(
      rangeStart.toJSDate(),
      rangeEnd.toJSDate(),
      true
    );

    for (const occ of occurrences) {
      if (exdates.includes(occ.getTime())) continue;
      busy.push({
        start: toDT(occ),
        end: toDT(new Date(occ.getTime() + durMs)),
        recurring: true,
      });
    }
  }

  busy.sort((a, b) => a.start.toMillis() - b.start.toMillis());

  console.log(`\nช่วง: ${rangeStart.toFormat("d LLL")} – ${rangeEnd.toFormat("d LLL yyyy")}`);
  console.log(`พบช่วงไม่ว่าง ${busy.length} รายการ (ข้ามนัดที่ตั้งเป็นว่าง ${skipped} รายการ)\n`);

  let currentDay = "";
  for (const b of busy) {
    const day = b.start.toFormat("ccc d LLL");
    if (day !== currentDay) {
      console.log(`\n${day}`);
      currentDay = day;
    }
    const mark = b.recurring ? " ↻" : "";
    console.log(`   ${b.start.toFormat("HH:mm")} – ${b.end.toFormat("HH:mm")}${mark}`);
  }
  console.log("");
}

main().catch(console.error);
