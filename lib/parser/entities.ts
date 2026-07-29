import {
  getOpenAiApiKey,
  OPENAI_API_URL,
  OPENAI_MODEL,
} from "@/lib/config";
import type {
  EntityExtractionResult,
  ExtractedEntities,
  SearchProfile,
} from "@/lib/types";

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    claims: {
      type: "array",
      items: { type: "string" },
      description: "Ключевые утверждения из текста",
    },
    dates: {
      type: "array",
      items: { type: "string" },
      description: "Упомянутые даты",
    },
    numbers: {
      type: "array",
      items: { type: "string" },
      description: "Важные числа, проценты, суммы",
    },
    names: {
      type: "array",
      items: { type: "string" },
      description: "Имена людей и организаций",
    },
    links: {
      type: "array",
      items: { type: "string" },
      description: "URL из текста",
    },
  },
  required: ["claims", "dates", "numbers", "names", "links"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `Ты анализируешь текст для поиска первоисточника информации.
Извлеки структурированные данные на русском языке.
claims — 1-5 ключевых проверяемых утверждений, сформулированных нейтрально.
dates — даты в исходном или ISO-подобном виде.
numbers — значимые числа с контекстом где возможно.
names — люди, компании, организации, геолокации если они важны для факта.
links — только явные URL из текста.`;

function extractLinksLocally(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/g) ?? [];
  return [...new Set(matches)];
}

function extractHeuristicEntities(text: string): ExtractedEntities {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 30);

  const dateMatches =
    text.match(
      /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)[а-я]*\s+\d{4}\b/gi,
    ) ?? [];

  const numberMatches =
    text.match(/\b\d+(?:[.,]\d+)?(?:\s?(?:%|млн|млрд|тыс|руб|₽|USD|\$|€))?\b/g) ??
    [];

  return {
    claims: sentences.slice(0, 3),
    dates: [...new Set(dateMatches)],
    numbers: [...new Set(numberMatches)].slice(0, 10),
    names: [],
    links: extractLinksLocally(text),
  };
}

async function extractWithOpenAi(text: string): Promise<ExtractedEntities> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return extractHeuristicEntities(text);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "entity_extraction",
            strict: true,
            schema: EXTRACTION_SCHEMA,
          },
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("OpenAI extraction failed:", response.status);
      return extractHeuristicEntities(text);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return extractHeuristicEntities(text);
    }

    const parsed = JSON.parse(content) as ExtractedEntities;
    return {
      claims: parsed.claims.filter(Boolean).slice(0, 5),
      dates: parsed.dates.filter(Boolean),
      numbers: parsed.numbers.filter(Boolean).slice(0, 10),
      names: parsed.names.filter(Boolean).slice(0, 10),
      links: [...new Set([...parsed.links, ...extractLinksLocally(text)])],
    };
  } catch (error) {
    console.error("OpenAI extraction error:", error);
    return extractHeuristicEntities(text);
  } finally {
    clearTimeout(timeout);
  }
}

export function buildSearchProfile(
  entities: ExtractedEntities,
): SearchProfile {
  const queries: string[] = [];

  for (const claim of entities.claims.slice(0, 3)) {
    queries.push(claim);
  }

  for (const claim of entities.claims.slice(0, 2)) {
    for (const name of entities.names.slice(0, 2)) {
      queries.push(`${claim} ${name}`);
    }
  }

  if (entities.dates.length > 0 && entities.claims[0]) {
    queries.push(`${entities.claims[0]} ${entities.dates[0]}`);
  }

  const uniqueQueries = [...new Set(queries.map((q) => q.trim()))]
    .filter((q) => q.length >= 10)
    .slice(0, 5);

  if (uniqueQueries.length === 0 && entities.names.length > 0) {
    uniqueQueries.push(entities.names.slice(0, 3).join(" "));
  }

  const dateFilter = entities.dates[0];

  return {
    queries: uniqueQueries.length > 0 ? uniqueQueries : [entities.claims[0] ?? ""].filter(Boolean),
    dateFilter,
  };
}

export async function extractEntities(
  text: string,
): Promise<EntityExtractionResult> {
  const entities = await extractWithOpenAi(text);
  const searchProfile = buildSearchProfile(entities);

  return { entities, searchProfile };
}

export function formatExtractionSummary(result: EntityExtractionResult): string {
  const { entities, searchProfile } = result;

  const lines = [
    "<b>Анализ текста завершён</b>",
    "",
    `<b>Утверждения:</b> ${entities.claims.length}`,
    ...entities.claims.map((claim, index) => `${index + 1}. ${escapeHtml(claim)}`),
    "",
    `<b>Даты:</b> ${entities.dates.length ? escapeHtml(entities.dates.join(", ")) : "—"}`,
    `<b>Числа:</b> ${entities.numbers.length ? escapeHtml(entities.numbers.join(", ")) : "—"}`,
    `<b>Имена:</b> ${entities.names.length ? escapeHtml(entities.names.join(", ")) : "—"}`,
    "",
    "<b>Поисковые запросы (готово к этапу поиска):</b>",
    ...searchProfile.queries.map(
      (query, index) => `${index + 1}. ${escapeHtml(query)}`,
    ),
  ];

  if (searchProfile.dateFilter) {
    lines.push("", `<b>Фильтр по дате:</b> ${escapeHtml(searchProfile.dateFilter)}`);
  }

  lines.push(
    "",
    "<i>Поиск источников будет добавлен на следующем этапе.</i>",
  );

  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Re-export for tests
export { extractHeuristicEntities };
