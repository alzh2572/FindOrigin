import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { validateWebAppInitData } from "@/lib/telegram/initData";

describe("validateWebAppInitData", () => {
  it("принимает корректно подписанные данные", () => {
    process.env.BOT_TOKEN = "123456:TEST_TOKEN";

    const user = JSON.stringify({ id: 1, first_name: "Test" });
    const pairs = [
      ["auth_date", "1700000000"],
      ["query_id", "AAE"],
      ["user", user],
    ] as const;

    const dataCheckString = pairs
      .slice()
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData")
      .update("123456:TEST_TOKEN")
      .digest();
    const hash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const initData = `${pairs
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")}&hash=${hash}`;

    expect(validateWebAppInitData(initData)).toBe(true);
  });

  it("отклоняет подделанный hash", () => {
    process.env.BOT_TOKEN = "123456:TEST_TOKEN";
    expect(
      validateWebAppInitData("auth_date=1700000000&hash=deadbeef"),
    ).toBe(false);
  });
});
