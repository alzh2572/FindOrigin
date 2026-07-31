import { describe, expect, it } from "vitest";
import { fitTelegramMessage, formatFinalReply } from "@/lib/format";

describe("formatFinalReply", () => {
  it("формирует ответ с источниками и disclaimer", () => {
    const text = formatFinalReply({
      summary: "Найдены близкие по смыслу публикации.",
      sources: [
        {
          url: "https://example.com/news",
          title: "Example News",
          confidence: "high",
          confidenceScore: 85,
          reason: "Совпадает ключевое утверждение.",
          isPrimary: true,
        },
      ],
    });

    expect(text).toContain("Возможные источники");
    expect(text).toContain("https://example.com/news");
    expect(text).toContain("высокая");
    expect(text).toContain("вероятностная оценка");
  });

  it("сообщает об отсутствии источников", () => {
    const text = formatFinalReply({
      summary: "Совпадений нет.",
      sources: [],
    });

    expect(text).toContain("Не найдено");
  });
});

describe("fitTelegramMessage", () => {
  it("обрезает слишком длинное сообщение", () => {
    const long = "a".repeat(5000);
    const fitted = fitTelegramMessage(long, 100);
    expect(fitted.length).toBeLessThanOrEqual(100);
    expect(fitted.endsWith("…")).toBe(true);
  });
});
