import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin", "latin-ext"],
  variable: "--font-syne",
  display: "swap",
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FindOrigin",
  description: "Telegram Mini App для поиска источников информации",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f1c24",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${syne.variable} ${ibmPlex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
