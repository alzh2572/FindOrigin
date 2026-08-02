import {
  getTelegramBotToken,
  TELEGRAM_API_BASE,
} from "@/lib/config";
import type { SendMessageResult } from "@/lib/types";

const REQUEST_TIMEOUT_MS = 15_000;

export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "TelegramApiError";
  }
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  web_app?: { url: string };
  callback_data?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface SendMessageOptions {
  replyMarkup?: InlineKeyboardMarkup;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableWebPagePreview?: boolean;
}

async function callTelegramApi<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = getTelegramBotToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = (await response.json()) as T & {
      ok?: boolean;
      description?: string;
    };

    if (!response.ok || data.ok === false) {
      throw new TelegramApiError(
        data.description ?? `Telegram API error: ${response.status}`,
        response.status,
      );
    }

    return data;
  } catch (error) {
    if (error instanceof TelegramApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new TelegramApiError("Telegram API request timed out");
    }
    throw new TelegramApiError(
      error instanceof Error ? error.message : "Unknown Telegram API error",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendMessage(
  chatId: number,
  text: string,
  options: SendMessageOptions = {},
): Promise<SendMessageResult> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode ?? "HTML",
    disable_web_page_preview: options.disableWebPagePreview ?? true,
  };

  if (options.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }

  return callTelegramApi<SendMessageResult>("sendMessage", body);
}

export async function setWebhook(url: string, secretToken?: string): Promise<void> {
  await callTelegramApi("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
}

export async function getWebhookInfo(): Promise<unknown> {
  return callTelegramApi("getWebhookInfo", {});
}
