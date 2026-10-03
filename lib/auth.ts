import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "qa_session";

export function sessionToken(): string | null {
  const pin = process.env.APP_PIN;
  if (!pin) return null;
  return crypto.createHmac("sha256", pin).update("queue-assistant-v1").digest("hex");
}

export function pinMatches(input: string): boolean {
  const pin = process.env.APP_PIN;
  if (!pin) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(pin);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function isAuthed(): Promise<boolean> {
  const token = sessionToken();
  if (!token) return false;
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value === token;
}

export function unauthorized() {
  return Response.json({ error: "กรุณาใส่ PIN ใหม่" }, { status: 401 });
}
