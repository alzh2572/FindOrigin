import { AiApiError, findSourcesWithAi } from "@/lib/ai";
import { MIN_INPUT_LENGTH } from "@/lib/config";
import { fitTelegramMessage, formatFinalReply } from "@/lib/format";
import {
  InputValidationError,
  parseUserInput,
  validateTextLength,
} from "@/lib/parser/input";
import { sendMessage, TelegramApiError } from "@/lib/telegram/client";
import type { ProcessResult } from "@/lib/types";

export async function processUserMessage(
  chatId: number,
  rawText: string,
): Promise<ProcessResult> {
  try {
    await sendMessage(chatId, "Обрабатываю…");

    const parsed = await parseUserInput(rawText);
    validateTextLength(parsed.text, MIN_INPUT_LENGTH);

    const ranking = await findSourcesWithAi(parsed.text);
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
