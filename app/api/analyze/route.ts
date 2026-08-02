import { NextRequest, NextResponse } from "next/server";
import { AiApiError } from "@/lib/ai";
import { analyzeText } from "@/lib/analyze";
import { InputValidationError } from "@/lib/parser/input";
import { authorizeMiniAppRequest } from "@/lib/telegram/initData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface AnalyzeBody {
  text?: string;
  initData?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: AnalyzeBody;

  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Некорректный JSON." },
      { status: 400 },
    );
  }

  const auth = authorizeMiniAppRequest(body.initData);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: 401 },
    );
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json(
      { ok: false, error: "Отправьте текст или ссылку на пост." },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeText(text);
    return NextResponse.json({
      ok: true,
      summary: result.summary,
      sources: result.sources,
    });
  } catch (error) {
    if (error instanceof InputValidationError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    if (error instanceof AiApiError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 502 },
      );
    }

    console.error("analyze API error:", error);
    return NextResponse.json(
      { ok: false, error: "Произошла ошибка при обработке. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
