import {
  getOpenAiApiKey,
  getOpenAiApiUrl,
  getOpenAiModel,
} from "@/lib/config";
import type {
  ConfidenceLevel,
  RankingResult,
  RankedSource,
} from "@/lib/types";

export class AiApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiApiError";
  }
}

const FIND_SOURCES_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "Краткий вывод на русском, 1-2 предложения",
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL возможного источника",
          },
          title: {
            type: "string",
            description: "Заголовок или название источника",
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          confidenceScore: {
            type: "integer",
            description: "Уверенность 0-100",
          },
          reason: {
            type: "string",
            description: "Почему источник релевантен, 1 предложение",
          },
          isPrimary: {
            type: "boolean",
            description: "Похож на первоисточник, а не на пересказ",
          },
        },
        required: [
          "url",
          "title",
          "confidence",
          "confidenceScore",
          "reason",
          "isPrimary",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "sources"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `Ты помощник по поиску первоисточников информации.
По исходному тексту найди от 0 до 3 возможных источников (официальные сайты, новостные агентства, блоги, исследования).
Сравнивай СМЫСЛ, а не дословное совпадение.
Указывай только реальные URL, в которых ты уверен. Не выдумывай ссылки.
Если надёжных источников нет — верни пустой список sources и честно опиши это в summary.
Отвечай на русском.`;

function normalizeConfidence(value: string): ConfidenceLevel {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "low";
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function findSourcesWithAi(
  originalText: string,
): Promise<RankingResult> {
  const apiKey = getOpenAiApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(getOpenAiApiUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/alzh2572/FindOrigin",
        "X-Title": "FindOrigin",
      },
      body: JSON.stringify({
        model: getOpenAiModel(),
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "find_sources",
            strict: true,
            schema: FIND_SOURCES_SCHEMA,
          },
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Исходный текст:\n${originalText}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new AiApiError(
        `Ошибка AI API (${getOpenAiModel()}): ${response.status} ${errText}`.trim(),
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new AiApiError("AI вернул пустой ответ");
    }

    const parsed = JSON.parse(content) as {
      summary: string;
      sources: Array<{
        url: string;
        title: string;
        confidence: string;
        confidenceScore: number;
        reason: string;
        isPrimary: boolean;
      }>;
    };

    const sources: RankedSource[] = [];
    const seen = new Set<string>();

    for (const item of parsed.sources.slice(0, 3)) {
      const url = item.url?.trim();
      if (!url || !isValidHttpUrl(url) || seen.has(url)) continue;
      seen.add(url);

      sources.push({
        url,
        title: item.title?.trim() || url,
        confidence: normalizeConfidence(item.confidence),
        confidenceScore: Math.max(
          0,
          Math.min(100, Number(item.confidenceScore) || 0),
        ),
        reason: item.reason,
        isPrimary: Boolean(item.isPrimary),
      });
    }

    return {
      summary:
        parsed.summary?.trim() ||
        (sources.length
          ? "Ниже возможные источники по смыслу исходного текста."
          : "Надёжных источников не найдено."),
      sources,
    };
  } catch (error) {
    if (error instanceof AiApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiApiError("Таймаут запроса к AI API.");
    }
    throw new AiApiError(
      error instanceof Error ? error.message : "Неизвестная ошибка AI API",
    );
  } finally {
    clearTimeout(timeout);
  }
}
