import { isAuthed, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

const API = "https://api.teamup.com";

/** ดึง calendar key จากลิงก์ เช่น https://teamup.com/ksaxmfd6bxxqq9wqdt */
function calendarKey(link: string): string | null {
  const m = link.trim().match(/(?:teamup\.com\/)?(k[a-z0-9]{8,})/i);
  return m ? m[1] : null;
}

async function teamup(path: string, init?: RequestInit) {
  const token = process.env.TEAMUP_API_KEY;
  if (!token) throw new Error("ยังไม่ได้ตั้งค่า TEAMUP_API_KEY ใน Vercel");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Teamup-Token": token, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || body?.error?.title || `HTTP ${res.status}`;
    throw new Error(`Teamup: ${msg}`);
  }
  return body;
}

type Slot = { start: string; end: string };

export async function POST(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as {
    action?: "subcalendars" | "create";
    link?: string;
    subcalendarId?: number;
    title?: string;
    slots?: Slot[];
  };
  const key = calendarKey(body.link ?? "");
  if (!key) return Response.json({ error: "ลิงก์ Teamup ไม่ถูกต้อง" }, { status: 400 });

  try {
    if (body.action === "subcalendars") {
      const data = await teamup(`/${key}/subcalendars`);
      const subcalendars = (data.subcalendars ?? [])
        .filter((s: { active?: boolean }) => s.active !== false)
        .map((s: { id: number; name: string; readonly?: boolean }) => ({ id: s.id, name: s.name, readonly: !!s.readonly }));
      return Response.json({ subcalendars });
    }

    if (body.action === "create") {
      if (!body.subcalendarId || !body.slots?.length || !body.title) {
        return Response.json({ error: "ข้อมูลไม่ครบ (ปฏิทินย่อย / ชื่อ / ช่วงเวลา)" }, { status: 400 });
      }
      if (body.slots.length > 60) return Response.json({ error: "ส่งได้ครั้งละไม่เกิน 60 ช่วง" }, { status: 400 });
      const results: { start: string; ok: boolean; error?: string }[] = [];
      for (const slot of body.slots) {
        try {
          await teamup(`/${key}/events`, {
            method: "POST",
            body: JSON.stringify({
              subcalendar_ids: [body.subcalendarId],
              start_dt: slot.start,
              end_dt: slot.end,
              all_day: false,
              title: body.title,
              who: body.title,
            }),
          });
          results.push({ start: slot.start, ok: true });
        } catch (e) {
          results.push({ start: slot.start, ok: false, error: (e as Error).message });
        }
      }
      return Response.json({ results });
    }

    return Response.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
