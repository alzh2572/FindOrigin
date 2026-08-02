import { AiApiError } from "@/lib/ai";
import { analyzeText } from "@/lib/analyze";
import { getAppUrl } from "@/lib/config";
import { fitTelegramMessage, formatFinalReply } from "@/lib/format";
import { InputValidationError } from "@/lib/parser/input";
import {
  sendMessage,
  TelegramApiError,
  type InlineKeyboardMarkup,
} from "@/lib/telegram/client";
import type { ProcessResult } from "@/lib/types";

const START_TEXT =
  "Привет! Отправьте текст новости или ссылку на Telegram-пост — я попробую найти источник. Или откройте приложение:";

function getMiniAppKeyboard(): InlineKeyboardMarkup | undefined {
  const appUrl = getAppUrl();
  if (!appUrl) return undefined;

  const miniAppUrl = `${appUrl.replace(/\/$/, "")}/app`;
  return {
    inline_keyboard: [
      [{ text: "Открыть FindOrigin", web_app: { url: miniAppUrl } }],
    ],
  };
}

async function handleStartCommand(chatId: number): Promise<ProcessResult> {
  const replyMarkup = getMiniAppKeyboard();
  const text = replyMarkup
    ? START_TEXT
    : "Привет! Отправьте текст новости или ссылку на Telegram-пост — я попробую найти источник.";

  await sendMessage(chatId, text, { replyMarkup });

  return {
    success: true,
    message: text,
  };
}

export async function processUserMessage(
  chatId: number,
  rawText: string,
): Promise<ProcessResult> {
  try {
    if (rawText.trim().startsWith("/start")) {
      return handleStartCommand(chatId);
    }

    await sendMessage(chatId, "Обрабатываю…");

    const ranking = await analyzeText(rawText);
    const message = fitTelegramMessage(formatFinalReply(ranking));

    await sendMessage(chatId, message);

    return {
      success: true,
      message,
      sources: ranking.sources,
    };
  } catch (error) {
    const userMessage =
      error instanceof InputValidationError
        ? error.message
        : error instanceof AiApiError
          ? error.message
          : error instanceof TelegramApiError
            ? "Ошибка отправки сообщения в Telegram. Попробуйте позже."
            : "Произошла ошибка при обработке. Попробуйте ещё раз.";

    console.error("processUserMessage error:", error);

    try {
      await sendMessage(chatId, userMessage);
    } catch (sendError) {
      console.error("Failed to send error message:", sendError);
    }

    return {
      success: false,
      message: userMessage,
    };
  }
}
