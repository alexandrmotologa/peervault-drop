import { useEffect, useState, useMemo } from 'react';

// Declarations for Telegram WebApp object
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          start_param?: string;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme: 'light' | 'dark';
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);

  const tg = useMemo(() => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      return window.Telegram.WebApp;
    }
    return null;
  }, []);

  const isTelegram = Boolean(tg && tg.initData && tg.initData.length > 0);

  useEffect(() => {
    if (tg) {
      tg.ready();
      try {
        tg.expand();
      } catch {
        // Ignored if expand not supported in browser emulation
      }
      setIsReady(true);
    }
  }, [tg]);

  const haptic = useMemo(() => {
    return {
      impact: (style: 'light' | 'medium' | 'heavy' = 'medium') => {
        try {
          tg?.HapticFeedback?.impactOccurred(style);
        } catch {
          // No-op outside Telegram
        }
      },
      notification: (type: 'success' | 'warning' | 'error') => {
        try {
          tg?.HapticFeedback?.notificationOccurred(type);
        } catch {
          // No-op outside Telegram
        }
      },
      selection: () => {
        try {
          tg?.HapticFeedback?.selectionChanged();
        } catch {
          // No-op outside Telegram
        }
      }
    };
  }, [tg]);

  const user = tg?.initDataUnsafe?.user;
  const startParam = tg?.initDataUnsafe?.start_param;

  const shareViaTelegram = (shareText: string, shareUrl: string) => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tgUrl);
    } else {
      window.open(tgUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return {
    tg,
    isReady,
    isTelegram,
    user,
    startParam,
    haptic,
    shareViaTelegram
  };
}
