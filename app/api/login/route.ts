import { cookies } from "next/headers";
import { isAuthed, pinMatches, sessionToken, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ authed: await isAuthed(), configured: Boolean(process.env.APP_PIN) });
}

export async function POST(req: Request) {
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
  if (!process.env.APP_PIN) {
    return Response.json({ error: "ยังไม่ได้ตั้งค่า APP_PIN ใน Vercel" }, { status: 500 });
  }
  if (!pin || !pinMatches(pin)) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "PIN ไม่ถูกต้อง" }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
