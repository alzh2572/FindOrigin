import { describe, expect, it } from "vitest";
import {
  buildSearchProfile,
  extractHeuristicEntities,
} from "@/lib/parser/entities";
import {
  extractTelegramPostUrl,
  isTelegramPostUrl,
  normalizeText,
  normalizeTelegramPostUrl,
} from "@/lib/parser/input";

describe("normalizeText", () => {
  it("убирает лишние пробелы и переносы", () => {
    const input = "  Первая   строка.\n\n\n\nВторая строка.  ";
    expect(normalizeText(input)).toBe("Первая строка.\n\nВторая строка.");
  });
});

describe("telegram post urls", () => {
  it("распознаёт ссылку на пост", () => {
    expect(isTelegramPostUrl("https://t.me/example_channel/123")).toBe(true);
    expect(isTelegramPostUrl("t.me/s/example_channel/456")).toBe(true);
  });

  it("нормализует URL поста", () => {
    expect(normalizeTelegramPostUrl("t.me/s/news/99")).toBe(
      "https://t.me/news/99",
    );
  });

  it("извлекает ссылку из текста с пояснением", () => {
    const url = extractTelegramPostUrl(
      "Смотрите пост https://t.me/news/42 за подробностями",
    );
    expect(url).toBe("https://t.me/news/42");
  });
});

describe("extractHeuristicEntities", () => {
  it("извлекает утверждения, даты и числа из новости", () => {
    const text =
      "Компания Example Corp объявила о росте выручки на 15% в 2025 году. " +
      "По данным отчёта, выручка составила 2,5 млрд рублей. " +
      "Генеральный директор Иван Петров прокомментировал результаты.";

    const entities = extractHeuristicEntities(text);

    expect(entities.claims.length).toBeGreaterThan(0);
    expect(entities.numbers.some((n) => n.includes("15"))).toBe(true);
    expect(entities.links).toEqual([]);
  });
});

describe("buildSearchProfile", () => {
  it("формирует 2-5 поисковых фраз", () => {
    const profile = buildSearchProfile({
      claims: [
        "Центробанк повысил ключевую ставку до 16%",
        "Решение вступает в силу с 1 августа 2025 года",
      ],
      dates: ["1 августа 2025"],
      numbers: ["16%"],
      names: ["Центробанк"],
      links: [],
    });

    expect(profile.queries.length).toBeGreaterThanOrEqual(2);
    expect(profile.queries.length).toBeLessThanOrEqual(5);
    expect(profile.dateFilter).toBe("1 августа 2025");
  });
});
