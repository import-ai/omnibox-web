import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { detectBrowserLanguage } from '@/lib/detect-language';

import locales from './locales';

// Check if running in Chrome PWA standalone mode
const isChromeStandalone = () => {
  const isChrome =
    /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return isChrome && isStandalone;
};

// Update PWA name based on language
const updatePWAName = (lang: string) => {
  const isZh = lang.toLowerCase().startsWith('zh');
  const appName = isZh ? '小黑' : 'OmniBox';
  const manifestHref = isZh ? '/manifest-zh.json' : '/manifest.json';

  // Update apple-mobile-web-app-title
  const metaTitle = document.querySelector(
    'meta[name="apple-mobile-web-app-title"]'
  );
  if (metaTitle) {
    metaTitle.setAttribute('content', appName);
  }

  // Update manifest link
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    manifestLink.setAttribute('href', manifestHref);
  }

  // Update page title (skip for Chrome PWA to avoid mixed name display)
  if (!isChromeStandalone()) {
    document.title = appName;
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  // options: https://www.i18next.com/overview/configuration-options
  .init({
    fallbackLng: detectBrowserLanguage(),
    resources: locales,
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

// Listen for language changes and update PWA name
i18n.on('languageChanged', updatePWAName);

export default i18n;
