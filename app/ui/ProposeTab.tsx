"use client";

import { useCallback, useState } from "react";
import type { Hold, Settings } from "@/lib/slots";
import { proposeReply } from "@/lib/replies";
import { Button, CopyBox, Field, inputCls, Section } from "./bits";
import { SlotPicker, type PickerState } from "./SlotPicker";

export function ProposeTab({
  settings,
  holds,
  addHolds,
  onUnauthorized,
}: {
  settings: Settings;
  holds: Hold[];
  addHolds: (items: Omit<Hold, "id">[]) => void;
  onUnauthorized: () => void;
}) {
  const [picked, setPicked] = useState<PickerState>({ durationMin: 60, selected: [] });
  const [label, setLabel] = useState("");
  const [held, setHeld] = useState(false);
  const onChange = useCallback((s: PickerState) => {
    setPicked(s);
    setHeld(false);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <SlotPicker title="เสนอเวลาว่างให้เขาเลือก" settings={settings} holds={holds} onUnauthorized={onUnauthorized} onChange={onChange} />
      {picked.selected.length > 0 && (
        <>
          <Section title="ข้อความตอบกลับ">
            <CopyBox text={proposeReply(picked.selected, picked.durationMin, settings)} />
          </Section>
          <Section title="กันช่วงที่เสนอไว้ก่อน">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                ช่วงที่กันไว้จะไม่ถูกเสนอให้คนอื่นซ้ำ จนกว่าจะปล่อยคืนในหน้าตั้งค่า
              </p>
              <Field label="กันไว้ให้ใคร">
                <input className={inputCls} value={label} placeholder="เช่น อ.สมชาย นัดคุยโครงการ" onChange={(e) => setLabel(e.target.value)} />
              </Field>
              <Button
                kind="quiet"
                disabled={held}
                onClick={() => {
                  addHolds(picked.selected.map((s) => ({ ...s, label })));
                  setHeld(true);
                }}
              >
                {held ? `กันไว้แล้ว ${picked.selected.length} ช่วง` : `กันไว้ ${picked.selected.length} ช่วง`}
              </Button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
