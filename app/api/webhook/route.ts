import { after, NextRequest, NextResponse } from "next/server";
import { getTelegramWebhookSecret } from "@/lib/config";
import { processUserMessage } from "@/lib/process";
import type { TelegramUpdate } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = getTelegramWebhookSecret();
  if (!secret) return true;

  const header = request.headers.get("x-telegram-bot-api-secret-token");
  return header === secret;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;

  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = update.message;
  const text = message?.text?.trim();
  const chatId = message?.chat.id;

  if (!message || !text || chatId === undefined) {
    return NextResponse.json({ ok: true });
  }

  after(async () => {
    await processUserMessage(chatId, text);
  });

  return NextResponse.json({ ok: true });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "FindOrigin webhook is running",
  });
}
