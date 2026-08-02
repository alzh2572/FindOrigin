import Script from "next/script";
import "./miniapp.css";

export default function MiniAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
