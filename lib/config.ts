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

export function getOpenAiApiKey(): string {
  const key =
    readEnv("OPENAI_API_KEY") ?? readEnv("OPENROUTER_API_KEY");
  if (!key) {
    throw new Error(
      "Не задан OPENAI_API_KEY (или OPENROUTER_API_KEY) в переменных окружения",
    );
  }
  return key;
}

export function getOpenAiApiUrl(): string {
  const explicit = readEnv("OPENAI_API_URL");
  if (explicit) return explicit;

  const base =
    readEnv("OPENAI_BASE_URL") ??
    (readEnv("OPENROUTER_API_KEY")
      ? "https://openrouter.ai/api/v1"
      : undefined);

  if (base) {
    return `${base.replace(/\/$/, "")}/chat/completions`;
  }

  return "https://api.openai.com/v1/chat/completions";
}

/** Для OpenRouter — openai/gpt-4o-mini, для OpenAI — gpt-4o-mini. */
export function getOpenAiModel(): string {
  const model = readEnv("OPENAI_MODEL") ?? "gpt-4o-mini";
  const apiUrl = getOpenAiApiUrl();
  const isOpenRouter = apiUrl.includes("openrouter.ai");

  if (isOpenRouter && !model.includes("/")) {
    return `openai/${model}`;
  }

  if (
    model.startsWith("openai/") &&
    apiUrl.includes("api.openai.com")
  ) {
    return model.slice("openai/".length);
  }

  return model;
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
