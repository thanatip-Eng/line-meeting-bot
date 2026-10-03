"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type BusyEvent, type Hold, type Settings } from "@/lib/slots";
import { addDays, bkk } from "@/lib/time";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* โหมดส่วนตัวของ Safari เขียนไม่ได้ — ใช้ค่าในหน่วยความจำต่อ */
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() =>
    typeof window === "undefined" ? DEFAULT_SETTINGS : readLocal("qa.settings", DEFAULT_SETTINGS),
  );
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeLocal("qa.settings", next);
      return next;
    });
  }, []);
  return [settings, update] as const;
}

export function useHolds() {
  const [holds, setHolds] = useState<Hold[]>(() =>
    typeof window === "undefined"
      ? []
      : // ทิ้งช่องที่เลยเวลาไปแล้ว
        readLocal<{ items: Hold[] }>("qa.holds", { items: [] }).items.filter((h) => h.end > Date.now()),
  );
  const save = (items: Hold[]) => {
    writeLocal("qa.holds", { items });
    return items;
  };
  const add = useCallback((items: Omit<Hold, "id">[]) => {
    setHolds((prev) =>
      save([...prev, ...items.map((h) => ({ ...h, id: Math.random().toString(36).slice(2) }))].sort((a, b) => a.start - b.start)),
    );
  }, []);
  const remove = useCallback((ids: string[]) => {
    setHolds((prev) => save(prev.filter((h) => !ids.includes(h.id))));
  }, []);
  return { holds, add, remove };
}

export type BusyState = {
  events: BusyEvent[];
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  refresh: () => void;
};

/** โหลดนัดจาก Outlook ในช่วงวันที่ (เวลาไทย) */
export function useBusy(fromDate: string, toDate: string, onUnauthorized: () => void): BusyState {
  const [nonce, setNonce] = useState(0);
  const key = `${fromDate}|${toDate}|${nonce}`;
  const [data, setData] = useState<{ key: string; events: BusyEvent[]; error: string | null; fetchedAt: number | null }>({
    key: "",
    events: [],
    error: null,
    fetchedAt: null,
  });
  const validRange = Boolean(fromDate && toDate && toDate >= fromDate);

  useEffect(() => {
    if (!validRange) return;
    const ctrl = new AbortController();
    const from = bkk(fromDate);
    const to = bkk(addDays(toDate, 1));
    fetch(`/api/busy?from=${from}&to=${to}${nonce ? "&fresh=1" : ""}`, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json();
        if (res.status === 401) return onUnauthorized();
        if (!res.ok) throw new Error(body.error ?? "โหลดปฏิทินไม่สำเร็จ");
        setData({ key, events: body.events, error: null, fetchedAt: body.fetchedAt });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setData((d) => ({ ...d, key, error: e.message }));
      });
    return () => ctrl.abort();
  }, [fromDate, toDate, nonce, key, validRange, onUnauthorized]);

  return {
    events: data.events,
    loading: validRange && data.key !== key,
    error: data.key === key ? data.error : null,
    fetchedAt: data.fetchedAt,
    refresh: () => setNonce((n) => n + 1),
  };
}
