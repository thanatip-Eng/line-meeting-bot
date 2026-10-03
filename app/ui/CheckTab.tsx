"use client";

import { useMemo, useState } from "react";
import { blockersFor, nearbyAlternatives, overlapping, workingWindow, type Hold, type Settings } from "@/lib/slots";
import { busyReply, freeReply, outlookComposeUrl } from "@/lib/replies";
import { addDays, bkk, fmtRange, MIN, thaiDateLong, todayKey } from "@/lib/time";
import { Button, CopyBox, DayStrip, Field, inputCls, Notice, Section } from "./bits";
import { useBusy } from "./hooks";

export function CheckTab({
  settings,
  holds,
  onUnauthorized,
}: {
  settings: Settings;
  holds: Hold[];
  onUnauthorized: () => void;
}) {
  const [date, setDate] = useState(todayKey());
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [subject, setSubject] = useState("");
  // โหลดล่วงหน้า 7 วันเพื่อหาช่องว่างทดแทน
  const busy = useBusy(date, addDays(date, 7), onUnauthorized);

  const iv = useMemo(() => ({ start: bkk(date, start), end: bkk(date, end) }), [date, start, end]);
  const valid = iv.end > iv.start;

  const result = useMemo(() => {
    if (!valid || busy.loading) return null;
    const conflicts = overlapping(busy.events, iv);
    const holdHits = holds.filter((h) => h.start < iv.end && h.end > iv.start);
    const buf = settings.bufferMin * MIN;
    const tight =
      conflicts.length === 0 &&
      blockersFor(busy.events.filter((e) => !e.allDay), [], settings).some((b) => b.start < iv.end && b.end > iv.start);
    const win = workingWindow(date, settings);
    const outside = !win || iv.start < win.start || iv.end > win.end;
    const hard = conflicts.filter((c) => c.status !== "tentative" && !c.allDay);
    const soft = conflicts.filter((c) => c.status === "tentative" || c.allDay);
    const free = hard.length === 0 && holdHits.length === 0;
    const alts = free ? [] : nearbyAlternatives(iv, busy.events, holds, settings);
    return { free, hard, soft, holdHits, tight: tight && buf > 0, outside, alts };
  }, [valid, busy.loading, busy.events, iv, holds, settings, date]);

  return (
    <div className="flex flex-col gap-4">
      <Section title="เขาถามว่าว่างไหม">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="วันที่">
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="เริ่ม">
            <input type="time" step={900} className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="ถึง">
            <input type="time" step={900} className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[30, 60, 90, 120].map((m) => (
            <button
              key={m}
              type="button"
              className="h-9 rounded-full border border-line px-3 text-sm text-muted"
              onClick={() => {
                const t = new Date(bkk(date, start) + m * MIN + 7 * 60 * MIN).toISOString().slice(11, 16);
                setEnd(t);
              }}
            >
              {m < 60 ? `${m} นาที` : `${m / 60} ชม.`}
            </button>
          ))}
        </div>
      </Section>

      {!valid && <Notice tone="busy">เวลาสิ้นสุดต้องหลังเวลาเริ่ม</Notice>}
      {busy.error && <Notice tone="busy">{busy.error}</Notice>}
      {busy.loading && <Notice>กำลังโหลดปฏิทิน Outlook…</Notice>}

      {result && (
        <Section>
          <div className={`mb-4 rounded-xl px-4 py-3 ${result.free ? "bg-free-soft" : "bg-busy-soft"}`}>
            <p className={`text-2xl font-semibold ${result.free ? "text-free" : "text-busy"}`}>
              {result.free ? "ว่าง" : "ติดนัด"}
            </p>
            <p className="text-sm">
              {thaiDateLong(date)} {fmtRange(iv)}
            </p>
          </div>

          <DayStrip date={date} events={busy.events} holds={holds} settings={settings} focus={iv} />

          <div className="mt-3 flex flex-col gap-2">
            {result.hard.map((c, i) => (
              <Notice key={`h${i}`} tone="busy">
                ชนกับ: {c.title} ({fmtRange(c)})
              </Notice>
            ))}
            {result.holdHits.map((h) => (
              <Notice key={h.id} tone="maybe">
                ชนกับช่องที่กันไว้: {h.label || "ไม่มีชื่อ"} ({fmtRange(h)})
              </Notice>
            ))}
            {result.soft.map((c, i) => (
              <Notice key={`s${i}`} tone="maybe">
                มีนัด{c.allDay ? "ทั้งวัน" : "ที่ยังไม่แน่นอน"}: {c.title}
              </Notice>
            ))}
            {result.free && result.tight && (
              <Notice tone="maybe">ว่าง แต่ติดนัดอื่นห่างไม่ถึง {settings.bufferMin} นาที</Notice>
            )}
            {result.outside && <Notice tone="maybe">อยู่นอกเวลาทำงานที่ตั้งไว้</Notice>}
          </div>
        </Section>
      )}

      {result && (
        <Section title="ข้อความตอบกลับ">
          <CopyBox text={result.free ? freeReply(iv, settings) : busyReply(iv, result.alts, settings)} />
        </Section>
      )}

      {result?.free && (
        <Section title="รับนัดแล้ว ลงปฏิทินเลย">
          <div className="flex flex-col gap-3">
            <Field label="ชื่อนัด">
              <input className={inputCls} value={subject} placeholder="เช่น ประชุมกับ…" onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Button href={outlookComposeUrl(iv, subject || "นัดหมาย")}>เปิดฟอร์มลงนัดใน Outlook</Button>
            <p className="text-xs text-muted">ตรวจรายละเอียดในฟอร์มแล้วกด Save ใน Outlook</p>
          </div>
        </Section>
      )}

      <div className="flex flex-col items-center gap-1 text-xs text-muted">
        <p>นัดที่เพิ่งลงใน Outlook อาจใช้เวลาสักพักกว่าจะขึ้นที่นี่</p>
        <button type="button" className="underline" onClick={busy.refresh}>
          โหลดปฏิทินใหม่
        </button>
      </div>
    </div>
  );
}
