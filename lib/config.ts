function readEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name]?.trim();
  if (value) return value;
  return fallback;
}

export function getTelegramBotToken(): string {
  const token =
    readEnv("TELEGRAM_BOT_TOKEN") ?? readEnv("BOT_TOKEN");
  if (!token) {
    throw new Error(
      "Не задан TELEGRAM_BOT_TOKEN (или BOT_TOKEN) в переменных окружения",
    );
  }
  return token;
}

export function getTelegramWebhookSecret(): string | undefined {
  return readEnv("TELEGRAM_WEBHOOK_SECRET");
}

export function getOpenAiApiKey(): string | undefined {
  return readEnv("OPENAI_API_KEY");
}

export function getAppUrl(): string | undefined {
  const appUrl = readEnv("APP_URL");
  if (appUrl) return appUrl;

  const vercelUrl = readEnv("VERCEL_URL");
  if (vercelUrl) return `https://${vercelUrl}`;

  return undefined;
}

export const MIN_INPUT_LENGTH = 20;

export const TELEGRAM_API_BASE = "https://api.telegram.org";

export const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export const OPENAI_MODEL = "gpt-4o-mini";
