import { createHmac, timingSafeEqual } from "node:crypto";
import { getTelegramBotToken } from "@/lib/config";

/**
 * Проверка Telegram WebApp initData (HMAC-SHA-256).
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateWebAppInitData(initData: string): boolean {
  if (!initData.trim()) return false;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;

    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const token = getTelegramBotToken();
    const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
    const calculated = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const hashBuf = Buffer.from(hash, "hex");
    const calcBuf = Buffer.from(calculated, "hex");
    if (hashBuf.length !== calcBuf.length) return false;

    return timingSafeEqual(hashBuf, calcBuf);
  } catch {
    return false;
  }
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/** В production initData обязателен и должен быть валидным. */
export function authorizeMiniAppRequest(initData?: string): {
  ok: boolean;
  error?: string;
} {
  const provided = initData?.trim();

  if (!provided) {
    if (isProductionRuntime()) {
      return {
        ok: false,
        error: "Требуется авторизация Telegram Mini App (initData).",
      };
    }
    return { ok: true };
  }

  if (!validateWebAppInitData(provided)) {
    return { ok: false, error: "Недействительные данные Telegram Mini App." };
  }

  return { ok: true };
}
