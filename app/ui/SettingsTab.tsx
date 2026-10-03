"use client";

import type { Hold, Settings } from "@/lib/slots";
import { dateKey, fmtRange, thaiDateShort } from "@/lib/time";
import { Button, Field, inputCls, Section } from "./bits";

export function SettingsTab({
  settings,
  update,
  holds,
  removeHolds,
  onLogout,
}: {
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  holds: Hold[];
  removeHolds: (ids: string[]) => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="ช่องที่กันไว้">
        {holds.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มี กันช่วงเวลาได้จากหน้าเสนอเวลา</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {holds.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {thaiDateShort(dateKey(h.start))} {fmtRange(h)}
                  </p>
                  <p className="truncate text-xs text-muted">{h.label || "ไม่มีชื่อ"}</p>
                </div>
                <button type="button" className="h-9 rounded-lg border border-line px-3 text-sm" onClick={() => removeHolds([h.id])}>
                  ปล่อยคืน
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">ช่องที่กันไว้เก็บในเครื่องนี้เท่านั้น ยังไม่ซิงก์ระหว่างมือถือกับคอม</p>
      </Section>

      <Section title="เวลาทำงาน">
        <div className="grid grid-cols-2 gap-3">
          <Field label="เริ่มงาน">
            <input type="time" step={900} className={inputCls} value={settings.dayStart} onChange={(e) => update({ dayStart: e.target.value })} />
          </Field>
          <Field label="เลิกงาน">
            <input type="time" step={900} className={inputCls} value={settings.dayEnd} onChange={(e) => update({ dayEnd: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="เว้นก่อน–หลังนัดเดิม">
              <select className={inputCls} value={settings.bufferMin} onChange={(e) => update({ bufferMin: Number(e.target.value) })}>
                {[0, 10, 15, 30, 60].map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? "ไม่เว้น" : `${m} นาที`}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <label className="flex h-10 items-center gap-3">
            <input type="checkbox" className="size-5" checked={settings.skipLunch} onChange={(e) => update({ skipLunch: e.target.checked })} />
            ไม่เสนอช่วงพักเที่ยง 12:00–13:00
          </label>
          <label className="flex h-10 items-center gap-3">
            <input type="checkbox" className="size-5" checked={settings.weekdaysOnly} onChange={(e) => update({ weekdaysOnly: e.target.checked })} />
            เฉพาะวันจันทร์–ศุกร์
          </label>
        </div>
      </Section>

      <Section title="ข้อความตอบกลับ">
        <Field label="ลงท้ายด้วย">
          <select className={inputCls} value={settings.particle} onChange={(e) => update({ particle: e.target.value as Settings["particle"] })}>
            <option value="ค่ะ">ค่ะ</option>
            <option value="ครับ">ครับ</option>
          </select>
        </Field>
      </Section>

      <Button kind="quiet" onClick={onLogout}>
        ออกจากระบบในเครื่องนี้
      </Button>
    </div>
  );
}
