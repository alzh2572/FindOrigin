const TELEGRAM_POST_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?t\.me\/(?:s\/)?([a-zA-Z0-9_]+)\/(\d+)\/?$/;

const TELEGRAM_POST_IN_TEXT_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?t\.me\/(?:s\/)?([a-zA-Z0-9_]+)\/(\d+)/g;

export function isTelegramPostUrl(input: string): boolean {
  return TELEGRAM_POST_PATTERN.test(input.trim());
}

export function extractTelegramPostUrl(input: string): string | null {
  const trimmed = input.trim();
  if (isTelegramPostUrl(trimmed)) {
    return normalizeTelegramPostUrl(trimmed);
  }

  const match = trimmed.match(TELEGRAM_POST_IN_TEXT_PATTERN);
  if (match?.[0]) {
    return normalizeTelegramPostUrl(match[0]);
  }

  return null;
}

export function normalizeTelegramPostUrl(url: string): string {
  const trimmed = url.trim();
  const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0] === "s") {
    parts.shift();
  }

  if (parts.length >= 2) {
    const channel = parts[0];
    const messageId = parts[1];
    return `https://t.me/${channel}/${messageId}`;
  }

  return withProtocol;
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function fetchTelegramPostText(url: string): Promise<string | null> {
  const normalized = normalizeTelegramPostUrl(url);
  const match = normalized.match(TELEGRAM_POST_PATTERN);
  if (!match) return null;

  const [, channel, messageId] = match;
  const previewUrl = `https://t.me/s/${channel}/${messageId}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(previewUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FindOriginBot/1.0; +https://github.com/findorigin)",
        Accept: "text/html",
      },
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    if (!response.ok) return null;

    const html = await response.text();
    return extractTextFromTelegramPreview(html, messageId);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractTextFromTelegramPreview(
  html: string,
  messageId: string,
): string | null {
  const messageBlocks = html.match(
    /<div class="tgme_widget_message_wrap[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g,
  );

  if (!messageBlocks?.length) {
    return extractFallbackMessageText(html);
  }

  const targetBlock =
    messageBlocks.find((block) => block.includes(`/${messageId}`)) ??
    messageBlocks[messageBlocks.length - 1];

  const textMatch = targetBlock.match(
    /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/,
  );

  if (!textMatch?.[1]) {
    return extractFallbackMessageText(html);
  }

  return normalizeText(stripHtml(textMatch[1]));
}

function extractFallbackMessageText(html: string): string | null {
  const matches = [
    ...html.matchAll(
      /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g,
    ),
  ];

  if (!matches.length) return null;

  const last = matches[matches.length - 1][1];
  return normalizeText(stripHtml(last));
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputValidationError";
  }
}

export async function parseUserInput(rawInput: string): Promise<{
  kind: "text" | "telegram_post";
  raw: string;
  text: string;
  sourceUrl?: string;
}> {
  const raw = rawInput.trim();

  if (!raw) {
    throw new InputValidationError("Пожалуйста, отправьте текст или ссылку на пост.");
  }

  if (raw.startsWith("/start")) {
    throw new InputValidationError(
      "Привет! Отправьте текст новости или ссылку на Telegram-пост — я попробую найти источник.",
    );
  }

  const postUrl = extractTelegramPostUrl(raw);

  if (postUrl) {
    const text = await fetchTelegramPostText(postUrl);
    if (!text) {
      throw new InputValidationError(
        "Не удалось получить текст поста. Скопируйте текст сообщения и отправьте его напрямую.",
      );
    }

    return {
      kind: "telegram_post",
      raw,
      text,
      sourceUrl: postUrl,
    };
  }

  return {
    kind: "text",
    raw,
    text: normalizeText(raw),
  };
}

export function validateTextLength(
  text: string,
  minLength: number,
): void {
  if (text.length < minLength) {
    throw new InputValidationError(
      `Текст слишком короткий (минимум ${minLength} символов). Добавьте больше деталей.`,
    );
  }
}
