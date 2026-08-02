import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        fontFamily: "var(--font-ibm-plex), sans-serif",
        padding: "2rem",
        maxWidth: 480,
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-syne), sans-serif",
          letterSpacing: "-0.03em",
          marginBottom: "0.5rem",
        }}
      >
        FindOrigin
      </h1>
      <p style={{ color: "#8aa3ad", lineHeight: 1.45 }}>
        Telegram-бот и Mini App для поиска источников информации.
      </p>
      <p>
        <Link href="/app" style={{ color: "#2ec4b6" }}>
          Открыть Mini App →
        </Link>
      </p>
      <p style={{ color: "#8aa3ad", fontSize: "0.9rem" }}>
        Webhook: <code>/api/webhook</code>
      </p>
    </main>
  );
}
