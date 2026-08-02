export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      username?: string;
    };
  };
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setText: (text: string) => void;
    enable: () => void;
    disable: () => void;
  };
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function initTelegramWebApp(): TelegramWebApp | null {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;

  webApp.ready();
  webApp.expand();

  try {
    webApp.setHeaderColor("#0f1c24");
    webApp.setBackgroundColor("#0f1c24");
  } catch {
    // старые клиенты могут не поддерживать
  }

  return webApp;
}

export function hapticSuccess(): void {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");
}

export function hapticError(): void {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred("error");
}

export function openExternalLink(url: string): void {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
