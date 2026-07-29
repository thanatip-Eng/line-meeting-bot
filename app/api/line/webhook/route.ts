import crypto from "crypto";

export const runtime = "nodejs";

export async function GET() {
  return new Response("bot is alive", { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  const expected = crypto
    .createHmac("SHA256", process.env.LINE_CHANNEL_SECRET!)
    .update(body)
    .digest("base64");

  if (signature !== expected) {
    return new Response("Invalid signature", { status: 401 });
  }

  const { events } = JSON.parse(body);
  await Promise.all(events.map(handleEvent));

  return new Response("OK", { status: 200 });
}

async function handleEvent(event: any) {
  if (event.type !== "message" || event.message.type !== "text") return;

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken: event.replyToken,
      messages: [{ type: "text", text: `ได้รับ: ${event.message.text}` }],
    }),
  });
}
