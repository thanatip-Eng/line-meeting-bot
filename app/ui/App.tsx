"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckTab } from "./CheckTab";
import { ProposeTab } from "./ProposeTab";
import { TeamupTab } from "./TeamupTab";
import { SettingsTab } from "./SettingsTab";
import { Button, inputCls, Notice } from "./bits";
import { useHolds, useSettings } from "./hooks";

type Tab = "check" | "propose" | "teamup" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "check", label: "ว่างไหม" },
  { id: "propose", label: "เสนอเวลา" },
  { id: "teamup", label: "Teamup" },
  { id: "settings", label: "ตั้งค่า" },
];

export function App() {
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [tab, setTab] = useState<Tab>("check");
  const [settings, updateSettings] = useSettings();
  const { holds, add, remove } = useHolds();

  useEffect(() => {
    fetch("/api/login")
      .then((r) => r.json())
      .then((d) => setAuth(d.authed ? "in" : "out"))
      .catch(() => setAuth("out"));
  }, []);

  const onUnauthorized = useCallback(() => setAuth("out"), []);
  const logout = async () => {
    await fetch("/api/login", { method: "DELETE" });
    setAuth("out");
  };

  if (auth === "loading") return <div className="min-h-dvh" />;
  if (auth === "out") return <Login onDone={() => setAuth("in")} />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <h1 className="text-xl font-semibold">คิวงาน</h1>
      </header>
      <main className="flex-1 px-4 pb-28">
        {tab === "check" && <CheckTab settings={settings} holds={holds} onUnauthorized={onUnauthorized} />}
        {tab === "propose" && <ProposeTab settings={settings} holds={holds} addHolds={add} onUnauthorized={onUnauthorized} />}
        {tab === "teamup" && (
          <TeamupTab settings={settings} updateSettings={updateSettings} holds={holds} onUnauthorized={onUnauthorized} />
        )}
        {tab === "settings" && (
          <SettingsTab settings={settings} update={updateSettings} holds={holds} removeHolds={remove} onLogout={logout} />
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => {
                  setTab(t.id);
                  window.scrollTo(0, 0);
                }}
                className={`relative flex h-14 w-full items-center justify-center text-sm ${
                  tab === t.id ? "font-semibold text-ink" : "text-muted"
                }`}
              >
                {tab === t.id && <span className="absolute top-0 h-1 w-10 rounded-b-full bg-free" />}
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) onDone();
    else setError(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
  };
  return (
    <form onSubmit={submit} className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">คิวงาน</h1>
      <p className="text-sm text-muted">ใส่ PIN เพื่อดูปฏิทินของคุณ เครื่องนี้จะจำไว้ 6 เดือน</p>
      <input
        className={inputCls}
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        autoFocus
      />
      {error && <Notice tone="busy">{error}</Notice>}
      <Button type="submit" disabled={!pin || busy}>
        {busy ? "กำลังตรวจสอบ…" : "เข้าใช้งาน"}
      </Button>
    </form>
  );
}
