"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ConfidenceLevel, RankedSource } from "@/lib/types";
import {
  getTelegramWebApp,
  hapticError,
  hapticSuccess,
  initTelegramWebApp,
  openExternalLink,
} from "@/lib/telegram/webapp";

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: "высокая",
  medium: "средняя",
  low: "низкая",
};

interface AnalyzeSuccess {
  ok: true;
  summary: string;
  sources: RankedSource[];
}

interface AnalyzeFailure {
  ok: false;
  error: string;
}

type AnalyzeResponse = AnalyzeSuccess | AnalyzeFailure;

export function FindOriginApp() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [sources, setSources] = useState<RankedSource[] | null>(null);

  useEffect(() => {
    initTelegramWebApp();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setSummary(null);
    setSources(null);

    try {
      const webApp = getTelegramWebApp();
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          initData: webApp?.initData || undefined,
        }),
      });

      const data = (await response.json()) as AnalyzeResponse;

      if (!data.ok) {
        setError(data.error || "Не удалось выполнить анализ.");
        hapticError();
        return;
      }

      setSummary(data.summary);
      setSources(data.sources);
      hapticSuccess();
    } catch {
      setError("Сеть недоступна. Проверьте соединение и попробуйте снова.");
      hapticError();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fo-root">
      <div className="fo-shell">
        <header className="fo-brand">
          <h1 className="fo-brand__mark">FindOrigin</h1>
          <p className="fo-brand__tag">
            Найдите возможный источник новости или Telegram-поста
          </p>
        </header>

        <form className="fo-form" onSubmit={onSubmit}>
          <label className="fo-label" htmlFor="claim">
            Текст или ссылка
          </label>
          <textarea
            id="claim"
            className="fo-textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Вставьте текст новости или ссылку t.me/…"
            disabled={loading}
            required
          />
          <button
            type="submit"
            className={`fo-submit${loading ? " is-loading" : ""}`}
            disabled={loading || text.trim().length === 0}
          >
            {loading ? "Ищем…" : "Найти источник"}
          </button>
        </form>

        {error ? <p className="fo-error">{error}</p> : null}

        {summary !== null && sources !== null ? (
          <section className="fo-results" aria-live="polite">
            <h2 className="fo-results__title">Возможные источники</h2>
            <p className="fo-results__summary">{summary}</p>

            {sources.length === 0 ? (
              <p className="fo-empty">
                Не найдено достаточно надёжных совпадений. Уточните текст или
                добавьте детали.
              </p>
            ) : (
              <ul className="fo-source-list">
                {sources.map((source) => (
                  <li key={source.url}>
                    <button
                      type="button"
                      className="fo-source"
                      onClick={() => openExternalLink(source.url)}
                    >
                      <span className="fo-source__title">{source.title}</span>
                      <p className="fo-source__meta">
                        Уверенность: {CONFIDENCE_LABEL[source.confidence]} (
                        {source.confidenceScore}%)
                        {source.isPrimary ? " · вероятно первичный" : ""}
                      </p>
                      <p className="fo-source__reason">{source.reason}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="fo-disclaimer">
              Результат — вероятностная оценка, не юридическое заключение.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
