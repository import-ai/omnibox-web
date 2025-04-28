import i18n from 'i18next';
import locales from './locales';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  // 所有配置选项: https://www.i18next.com/overview/configuration-options
  .init({
    fallbackLng: 'en',
    resources: locales,
    lng: navigator.language,
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18n;

// const { t, i18n } = useTranslation();
// i18n.changeLanguage('zh');
