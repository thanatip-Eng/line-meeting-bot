import { isAuthed, unauthorized } from "@/lib/auth";
import { getBusy } from "@/lib/ics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RANGE = 93 * 24 * 3600 * 1000;

export async function GET(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const url = new URL(req.url);
  const from = Number(url.searchParams.get("from"));
  const to = Number(url.searchParams.get("to"));
  if (!from || !to || to <= from || to - from > MAX_RANGE) {
    return Response.json({ error: "ช่วงวันที่ไม่ถูกต้อง (สูงสุด 3 เดือน)" }, { status: 400 });
  }
  try {
    const events = await getBusy(from, to, url.searchParams.get("fresh") === "1");
    return Response.json({ events, fetchedAt: Date.now() });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
