"use client";

import { useState, type ReactNode } from "react";
import type { BusyEvent, Hold, Settings } from "@/lib/slots";
import { bkk, fmtRange, type Interval } from "@/lib/time";

export function Section({ title, children, aside }: { title?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      {(title || aside) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-xl border border-line bg-paper px-3 text-base outline-none focus:border-[var(--focus)]";

export function Button({
  children,
  onClick,
  kind = "primary",
  disabled,
  type = "button",
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "quiet";
  disabled?: boolean;
  type?: "button" | "submit";
  href?: string;
}) {
  const cls =
    kind === "primary"
      ? "bg-ink text-paper disabled:opacity-40"
      : "border border-line bg-surface text-ink disabled:opacity-40";
  const base = `inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium ${cls}`;
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={base}>
        {children}
      </a>
    );
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  );
}

export function CopyBox({ text, label = "คัดลอกข้อความ" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="flex flex-col gap-2">
      <pre className="whitespace-pre-wrap rounded-xl bg-paper p-3 text-sm leading-relaxed">{text}</pre>
      <Button onClick={copy}>{copied ? "คัดลอกแล้ว" : label}</Button>
    </div>
  );
}

export function Notice({ tone = "muted", children }: { tone?: "muted" | "busy" | "maybe"; children: ReactNode }) {
  const cls =
    tone === "busy" ? "bg-busy-soft text-busy" : tone === "maybe" ? "bg-maybe-soft text-maybe" : "bg-paper text-muted";
  return <p className={`rounded-xl px-3 py-2 text-sm ${cls}`}>{children}</p>;
}

/** แถบเวลาของวัน: นัดเดิม ช่องที่กันไว้ และช่วงที่ถาม */
export function DayStrip({
  date,
  events,
  holds,
  settings,
  focus,
  free,
}: {
  date: string;
  events: BusyEvent[];
  holds: Hold[];
  settings: Settings;
  focus?: Interval;
  free?: Interval[];
}) {
  const dayStart = bkk(date);
  const dayEnd = dayStart + 24 * 3600e3;
  const timed = events.filter((e) => !e.allDay && e.end > dayStart && e.start < dayEnd);
  const allDay = events.filter((e) => e.allDay && e.end > dayStart && e.start < dayEnd);
  const hourOf = (t: number) => (t - dayStart) / 3600e3;
  const pts = [
    hourOf(bkk(date, settings.dayStart)),
    hourOf(bkk(date, settings.dayEnd)),
    ...timed.flatMap((e) => [hourOf(e.start), hourOf(e.end)]),
    ...(focus ? [hourOf(focus.start), hourOf(focus.end)] : []),
  ];
  const lo = Math.max(0, Math.floor(Math.min(...pts)));
  const hi = Math.min(24, Math.ceil(Math.max(...pts)));
  const span = hi - lo || 1;
  const pos = (t: number) => `${((Math.min(Math.max(hourOf(t), lo), hi) - lo) / span) * 100}%`;
  const width = (iv: Interval) =>
    `${((Math.min(hourOf(iv.end), hi) - Math.max(hourOf(iv.start), lo)) / span) * 100}%`;
  const ticks = Array.from({ length: span + 1 }, (_, i) => lo + i);
  const dayHolds = holds.filter((h) => h.end > dayStart && h.start < dayEnd);

  return (
    <div className="flex flex-col gap-2">
      {allDay.map((e, i) => (
        <Notice key={i} tone={e.status === "oof" ? "busy" : "maybe"}>
          ทั้งวัน: {e.title}
        </Notice>
      ))}
      <div className="relative h-14 overflow-hidden rounded-xl bg-paper" aria-hidden>
        <div
          className="absolute inset-y-0 bg-surface"
          style={{ left: pos(bkk(date, settings.dayStart)), width: width({ start: bkk(date, settings.dayStart), end: bkk(date, settings.dayEnd) }) }}
        />
        {free?.map((f, i) => (
          <div key={`f${i}`} className="absolute inset-y-0 bg-free-soft" style={{ left: pos(f.start), width: width(f) }} />
        ))}
        {ticks.map((h) => (
          <div key={h} className="absolute inset-y-0 w-px bg-line" style={{ left: `${((h - lo) / span) * 100}%` }} />
        ))}
        {timed.map((e, i) => (
          <div
            key={i}
            className={`absolute top-2 bottom-2 rounded-md ${e.status === "tentative" ? "bg-maybe/70" : "bg-busy/80"}`}
            style={{ left: pos(e.start), width: width(e) }}
          />
        ))}
        {dayHolds.map((h) => (
          <div
            key={h.id}
            className="absolute top-2 bottom-2 rounded-md border-2 border-dashed border-maybe"
            style={{ left: pos(h.start), width: width(h) }}
          />
        ))}
        {focus && (
          <div
            className="absolute inset-y-0.5 rounded-lg border-[3px] border-ink"
            style={{ left: pos(focus.start), width: width(focus) }}
          />
        )}
      </div>
      <div className="relative h-4 text-[11px] text-muted">
        {ticks.filter((h) => span <= 12 || h % 2 === 0).map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: `${((h - lo) / span) * 100}%` }}>
            {h}
          </span>
        ))}
      </div>
      {timed.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {timed.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-28 shrink-0 text-muted">{fmtRange(e)}</span>
              <span className="min-w-0 truncate">
                {e.title}
                {e.status === "tentative" && <span className="text-maybe"> (ยังไม่แน่นอน)</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        allDay.length === 0 && <p className="text-sm text-muted">ไม่มีนัดในวันนี้</p>
      )}
    </div>
  );
}
