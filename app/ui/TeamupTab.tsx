"use client";

import { useCallback, useState } from "react";
import type { Hold, Settings } from "@/lib/slots";
import { teamupText } from "@/lib/replies";
import { toOffsetIso } from "@/lib/time";
import { Button, CopyBox, Field, inputCls, Notice, Section } from "./bits";
import { SlotPicker, type PickerState } from "./SlotPicker";

type Sub = { id: number; name: string; readonly: boolean };

export function TeamupTab({
  settings,
  updateSettings,
  holds,
  onUnauthorized,
}: {
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  holds: Hold[];
  onUnauthorized: () => void;
}) {
  const [link, setLink] = useState("");
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [subId, setSubId] = useState<number | null>(null);
  const [picked, setPicked] = useState<PickerState>({ durationMin: 60, selected: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ ok: number; failed: string[] } | null>(null);
  const onChange = useCallback((s: PickerState) => {
    setPicked(s);
    setDone(null);
  }, []);

  const call = async (body: object) => {
    const res = await fetch("/api/teamup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.status === 401) onUnauthorized();
    if (!res.ok) throw new Error(data.error ?? "เชื่อม Teamup ไม่สำเร็จ");
    return data;
  };

  const loadSubs = async () => {
    setError(null);
    setBusy(true);
    try {
      const data = await call({ action: "subcalendars", link });
      setSubs(data.subcalendars);
      const writable = data.subcalendars.filter((s: Sub) => !s.readonly);
      setSubId(writable.length === 1 ? writable[0].id : null);
    } catch (e) {
      setError((e as Error).message);
      setSubs(null);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      const data = await call({
        action: "create",
        link,
        subcalendarId: subId,
        title: settings.teamupName,
        slots: picked.selected.map((s) => ({ start: toOffsetIso(s.start), end: toOffsetIso(s.end) })),
      });
      const results = data.results as { ok: boolean; error?: string }[];
      setDone({ ok: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).map((r) => r.error ?? "") });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const canSend = !!subId && !!settings.teamupName.trim() && picked.selected.length > 0 && !busy;

  return (
    <div className="flex flex-col gap-4">
      <Section title="ลิงก์ Teamup ที่ได้รับ">
        <div className="flex flex-col gap-3">
          <Field label="วางลิงก์">
            <input
              className={inputCls}
              inputMode="url"
              placeholder="https://teamup.com/…"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setSubs(null);
                setSubId(null);
              }}
            />
          </Field>
          <Field label="ชื่อที่ใส่ใน event" hint="จำไว้ใช้ครั้งต่อไป">
            <input className={inputCls} value={settings.teamupName} onChange={(e) => updateSettings({ teamupName: e.target.value })} />
          </Field>
          {!subs && (
            <Button kind="quiet" disabled={!link.trim() || busy} onClick={loadSubs}>
              {busy ? "กำลังเชื่อม…" : "เชื่อมปฏิทินนี้"}
            </Button>
          )}
          {subs && (
            <Field label="ลงในปฏิทินย่อย">
              <select className={inputCls} value={subId ?? ""} onChange={(e) => setSubId(Number(e.target.value) || null)}>
                <option value="">เลือกปฏิทินย่อย</option>
                {subs.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.readonly}>
                    {s.name}
                    {s.readonly ? " (อ่านอย่างเดียว)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </Section>

      <SlotPicker
        title="ช่วงที่เขาให้กรอก"
        settings={settings}
        holds={holds}
        onUnauthorized={onUnauthorized}
        defaultDays={14}
        defaultDuration={60}
        onChange={onChange}
      />

      {error && <Notice tone="busy">{error}</Notice>}

      {picked.selected.length > 0 && (
        <Section title="ส่งเข้า Teamup">
          <div className="flex flex-col gap-3">
            {done ? (
              <>
                <Notice tone={done.failed.length ? "maybe" : "muted"}>
                  เพิ่มใน Teamup แล้ว {done.ok} ช่วง
                  {done.failed.length > 0 && <><br />ไม่สำเร็จ {done.failed.length} ช่วง: {done.failed[0]}</>}
                </Notice>
                {link && <Button kind="quiet" href={link}>เปิด Teamup ดูผล</Button>}
              </>
            ) : (
              <Button disabled={!canSend} onClick={send}>
                {busy ? "กำลังส่ง…" : `ส่ง ${picked.selected.length} ช่วงเข้า Teamup`}
              </Button>
            )}
            {!settings.teamupName.trim() && <p className="text-xs text-muted">ใส่ชื่อที่ใช้ใน event ก่อน</p>}
            {!subs && <p className="text-xs text-muted">กด “เชื่อมปฏิทินนี้” ก่อน</p>}
          </div>
        </Section>
      )}

      {picked.selected.length > 0 && (
        <Section title="ทางสำรอง: ให้ Claude in Chrome กรอกให้">
          <CopyBox text={teamupText(picked.selected, settings.teamupName, link)} label="คัดลอกคำสั่ง" />
        </Section>
      )}
    </div>
  );
}
