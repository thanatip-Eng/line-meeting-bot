import ical from "node-ical";
import type { BusyEvent } from "./slots";
import { bkk } from "./time";

type Cache = { at: number; text: string };
let cache: Cache | null = null;
const TTL = 3 * 60 * 1000;

async function loadIcsText(fresh: boolean): Promise<string> {
  const url = process.env.ICS_URL;
  if (!url) throw new Error("ยังไม่ได้ตั้งค่า ICS_URL ใน Vercel");
  if (!fresh && cache && Date.now() - cache.at < TTL) return cache.text;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`โหลดปฏิทิน Outlook ไม่ได้ (HTTP ${res.status})`);
  const text = await res.text();
  cache = { at: Date.now(), text };
  return text;
}

function busyStatus(ev: Record<string, unknown>): BusyEvent["status"] | null {
  const raw = String(ev["MICROSOFT-CDO-BUSYSTATUS"] ?? "").toUpperCase();
  if (String(ev.status ?? "").toUpperCase() === "CANCELLED") return null;
  if (raw === "FREE" || raw === "WORKINGELSEWHERE") return null;
  if (!raw && String(ev.transparency ?? "").toUpperCase() === "TRANSPARENT") return null;
  if (raw === "TENTATIVE") return "tentative";
  if (raw === "OOF") return "oof";
  return "busy";
}

/** วันทั้งวัน: node-ical สร้างเป็นเที่ยงคืนตาม timezone ของเครื่อง → แปลงเป็นเที่ยงคืนเวลาไทย */
function fullDayToBkk(d: Date): number {
  const pad = (n: number) => String(n).padStart(2, "0");
  return bkk(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
}

export async function getBusy(from: number, to: number, fresh = false): Promise<BusyEvent[]> {
  const text = await loadIcsText(fresh);
  const data = ical.sync.parseICS(text);
  const out: BusyEvent[] = [];
  for (const comp of Object.values(data)) {
    if (!comp || comp.type !== "VEVENT") continue;
    const instances = ical.expandRecurringEvent(comp, {
      from: new Date(from - 24 * 3600 * 1000),
      to: new Date(to),
      expandOngoing: true,
    });
    for (const inst of instances) {
      const src = (inst.event ?? comp) as unknown as Record<string, unknown>;
      const status = busyStatus(src);
      if (!status) continue;
      const start = inst.isFullDay ? fullDayToBkk(inst.start) : inst.start.getTime();
      const end = inst.isFullDay ? fullDayToBkk(inst.end) : inst.end.getTime();
      if (end <= from || start >= to) continue;
      const summary = typeof inst.summary === "string" ? inst.summary : String((inst.summary as { val?: string })?.val ?? "");
      out.push({ start, end, title: summary || "(ไม่มีชื่อ)", status, allDay: inst.isFullDay });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
