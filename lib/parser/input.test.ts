import { describe, expect, it } from "vitest";
import {
  extractTelegramPostUrl,
  isTelegramPostUrl,
  normalizeText,
} from "@/lib/parser/input";

describe("parseUserInput helpers", () => {
  it("отклоняет пустой ввод на уровне нормализации", () => {
    expect(normalizeText("   ")).toBe("");
  });

  it("находит telegram post в коротком сообщении-ссылке", () => {
    expect(isTelegramPostUrl("https://t.me/durov/1")).toBe(true);
    expect(extractTelegramPostUrl("https://t.me/durov/1")).toBe(
      "https://t.me/durov/1",
    );
  });
});
