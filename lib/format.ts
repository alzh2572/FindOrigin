import type { ConfidenceLevel, RankingResult } from "@/lib/types";

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: "высокая",
  medium: "средняя",
  low: "низкая",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatFinalReply(result: RankingResult): string {
  const lines: string[] = ["<b>Возможные источники</b>", ""];

  if (result.summary) {
    lines.push(escapeHtml(result.summary), "");
  }

  if (result.sources.length === 0) {
    lines.push(
      "Не найдено достаточно надёжных совпадений. Попробуйте уточнить текст или добавить детали.",
      "",
      "<i>Результат — вероятностная оценка, не юридическое заключение.</i>",
    );
    return lines.join("\n");
  }

  result.sources.forEach((source, index) => {
    const confidence = `${CONFIDENCE_LABEL[source.confidence]} (${source.confidenceScore}%)`;
    const primary = source.isPrimary ? " · вероятно первичный" : "";

    lines.push(
      `<b>${index + 1}.</b> <a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a>`,
      `Уверенность: ${confidence}${primary}`,
      escapeHtml(source.reason),
      "",
    );
  });

  lines.push(
    "<i>Результат — вероятностная оценка, не юридическое заключение.</i>",
  );

  return lines.join("\n");
}

export function fitTelegramMessage(text: string, maxLength = 4000): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 20).trimEnd()}\n…`;
}
