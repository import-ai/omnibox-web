import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { detectBrowserLanguage } from '@/lib/detect-language';

import locales from './locales';

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

export default i18n;
