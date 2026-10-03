"use client";

import { useEffect, useMemo, useState } from "react";
import { freeWindows, type Hold, type Settings } from "@/lib/slots";
import { addDays, dateKey, fmtDuration, fmtRange, thaiDateShort, todayKey, type Interval } from "@/lib/time";
import { Field, inputCls, Notice, Section } from "./bits";
import { useBusy } from "./hooks";

export type PickerState = {
  durationMin: number;
  selected: Interval[];
};

/** เลือกช่วงวันที่ + ระยะเวลา แล้วแสดงช่วงว่างให้ติ๊กเลือก */
export function SlotPicker({
  settings,
  holds,
  onUnauthorized,
  defaultDays = 7,
  defaultDuration = 60,
  title,
  onChange,
}: {
  settings: Settings;
  holds: Hold[];
  onUnauthorized: () => void;
  defaultDays?: number;
  defaultDuration?: number;
  title: string;
  onChange: (s: PickerState) => void;
}) {
  const [from, setFrom] = useState(todayKey());
  const [to, setTo] = useState(addDays(todayKey(), defaultDays - 1));
  const [duration, setDuration] = useState(defaultDuration);
  const rangeKey = `${from}|${to}|${duration}`;
  // ติ๊กออกเก็บแยกตามช่วงที่ค้น เปลี่ยนช่วงแล้วเริ่มติ๊กครบใหม่
  const [uncheckedState, setUncheckedState] = useState<{ key: string; set: Set<number> }>({ key: "", set: new Set() });
  const unchecked = uncheckedState.key === rangeKey ? uncheckedState.set : new Set<number>();
  const busy = useBusy(from, to, onUnauthorized);

  const windows = useMemo(
    () => (busy.loading || busy.error || to < from ? [] : freeWindows(from, to, duration, busy.events, holds, settings)),
    [busy.loading, busy.error, busy.events, from, to, duration, holds, settings],
  );

  const selected = useMemo(
    () => windows.filter((w) => !(uncheckedState.key === rangeKey && uncheckedState.set.has(w.start))),
    [windows, uncheckedState, rangeKey],
  );
  useEffect(() => onChange({ durationMin: duration, selected }), [duration, selected, onChange]);

  const byDay = useMemo(() => {
    const map = new Map<string, Interval[]>();
    for (const w of windows) {
      const d = dateKey(w.start);
      map.set(d, [...(map.get(d) ?? []), w]);
    }
    return [...map.entries()];
  }, [windows]);

  const toggle = (start: number) =>
    setUncheckedState((prev) => {
      const next = new Set(prev.key === rangeKey ? prev.set : []);
      if (next.has(start)) next.delete(start);
      else next.add(start);
      return { key: rangeKey, set: next };
    });

  return (
    <div className="flex flex-col gap-4">
      <Section title={title}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ตั้งแต่วันที่">
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="ถึงวันที่">
            <input type="date" className={inputCls} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="ต้องว่างต่อเนื่องอย่างน้อย">
              <select className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[30, 60, 90, 120, 180, 240].map((m) => (
                  <option key={m} value={m}>
                    {fmtDuration(m)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          คิดเฉพาะ {settings.dayStart}–{settings.dayEnd} น.
          {settings.weekdaysOnly ? " วันจันทร์–ศุกร์" : " ทุกวัน"}
          {settings.skipLunch ? " ไม่รวมพักเที่ยง" : ""} เว้นจากนัดเดิม {settings.bufferMin} นาที (แก้ได้ที่ตั้งค่า)
        </p>
      </Section>

      {to < from && <Notice tone="busy">วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม</Notice>}
      {busy.error && <Notice tone="busy">{busy.error}</Notice>}
      {busy.loading && <Notice>กำลังโหลดปฏิทิน Outlook…</Notice>}

      {!busy.loading && !busy.error && to >= from && (
        <Section
          title={windows.length ? `ช่วงว่าง ${selected.length}/${windows.length} ช่วง` : "ไม่พบช่วงว่าง"}
          aside={
            <button type="button" className="text-sm text-muted underline" onClick={busy.refresh}>
              โหลดใหม่
            </button>
          }
        >
          {windows.length === 0 ? (
            <p className="text-sm text-muted">ลองขยายช่วงวันที่ หรือลดระยะเวลาที่ต้องการ</p>
          ) : (
            <div className="flex flex-col gap-3">
              {byDay.map(([d, list]) => (
                <div key={d}>
                  <p className="mb-1 text-sm font-medium">{thaiDateShort(d)}</p>
                  <ul className="flex flex-col gap-1">
                    {list.map((w) => (
                      <li key={w.start}>
                        <label className="flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2 has-[:checked]:bg-free-soft">
                          <input
                            type="checkbox"
                            className="size-5 accent-[var(--free)]"
                            checked={!unchecked.has(w.start)}
                            onChange={() => toggle(w.start)}
                          />
                          <span className="text-sm">{fmtRange(w)}</span>
                          <span className="ml-auto text-xs text-muted">{fmtDuration(Math.round((w.end - w.start) / 60000))}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
