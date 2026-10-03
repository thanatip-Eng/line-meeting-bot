import { DateTime } from "luxon";
import { fetchBusy, TZ } from "../lib/ics";
import { findCommonSlots, Member } from "../lib/slots";

const DURATION_MIN = 90;
const DAYS_AHEAD = 14;

async function main() {
  const raw = process.env.TEST_ICS_URLS;
  if (!raw) throw new Error("ยังไม่ได้ใส่ TEST_ICS_URLS");

  const entries = raw.split(",").map((s) => s.trim()).filter(Boolean);

  const rangeStart = DateTime.now().setZone(TZ).startOf("day");
  const rangeEnd = rangeStart.plus({ days: DAYS_AHEAD });

  const members: Member[] = [];
  for (let i = 0; i < entries.length; i++) {
    const [name, url] = entries[i].includes("|")
      ? entries[i].split("|").map((s) => s.trim())
      : [`คนที่ ${i + 1}`, entries[i]];

    const busy = await fetchBusy(url, rangeStart, rangeEnd);
    console.log(`✓ ${name} — พบช่วงไม่ว่าง ${busy.length} ก้อน`);
    members.push({ id: String(i), name, busy });
  }

  const slots = findCommonSlots({
    members,
    rangeStart,
    rangeEnd,
    durationMin: DURATION_MIN,
  });

  console.log(`\nช่วงที่แนะนำ (${DURATION_MIN} นาที):\n`);

  if (slots.length === 0) {
    console.log("  ไม่พบช่วงที่ว่างเลยในกรอบเวลาทำงาน");
    return;
  }

  slots.forEach((s, i) => {
    const when = `${s.start.setLocale("th").toFormat("ccc d LLL")} ${s.start.toFormat("HH:mm")}–${s.end.toFormat("HH:mm")}`;
    const status =
      s.unavailable.length === 0
        ? "ทุกคนว่าง ✓"
        : `ว่าง ${s.available.length}/${members.length} (ติด: ${s.unavailable.map((m) => m.name).join(", ")})`;
    console.log(`  ${i + 1}. ${when}   ${status}`);
  });
  console.log("");
}

main().catch(console.error);
