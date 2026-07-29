import { NextRequest, NextResponse } from "next/server";
import { getAppUrl, getTelegramWebhookSecret } from "@/lib/config";
import { getWebhookInfo, setWebhook } from "@/lib/telegram/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    url?: string;
  };

  const baseUrl = body.url ?? getAppUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error:
          "Укажите url в теле запроса или задайте APP_URL / VERCEL_URL",
      },
      { status: 400 },
    );
  }

  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/webhook`;
  const secret = getTelegramWebhookSecret();

  try {
    await setWebhook(webhookUrl, secret);
    const info = await getWebhookInfo();

    return NextResponse.json({
      ok: true,
      webhookUrl,
      info,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to set webhook",
      },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const info = await getWebhookInfo();
    return NextResponse.json({ ok: true, info });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get webhook info",
      },
      { status: 500 },
    );
  }
}
