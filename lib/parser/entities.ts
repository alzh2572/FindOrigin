import type {
  EntityExtractionResult,
  ExtractedEntities,
  SearchProfile,
} from "@/lib/types";

function extractLinksLocally(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/g) ?? [];
  return [...new Set(matches)];
}

export function extractHeuristicEntities(text: string): ExtractedEntities {
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

  const shortClaims =
    sentences.length > 0
      ? sentences.slice(0, 3)
      : [text.slice(0, 200).trim()].filter(Boolean);

  return {
    claims: shortClaims,
    dates: [...new Set(dateMatches)],
    numbers: [...new Set(numberMatches)].slice(0, 10),
    names: [],
    links: extractLinksLocally(text),
  };
}

export function buildSearchProfile(
  entities: ExtractedEntities,
  originalText?: string,
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

  if (uniqueQueries.length === 0) {
    const fallback =
      originalText?.slice(0, 160).trim() ||
      entities.names.slice(0, 3).join(" ") ||
      entities.claims[0] ||
      "";
    if (fallback) uniqueQueries.push(fallback);
  }

  return {
    queries: uniqueQueries,
    dateFilter: entities.dates[0],
  };
}

/** Локальный разбор для поисковых запросов — без AI и без ответа пользователю. */
export function extractEntities(text: string): EntityExtractionResult {
  const entities = extractHeuristicEntities(text);
  const searchProfile = buildSearchProfile(entities, text);
  return { entities, searchProfile };
}
