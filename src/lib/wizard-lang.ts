import type { i18n as I18nType } from 'i18next';

export type WizardLang = '简体中文' | 'English';

export function getWizardLang(i18n: I18nType): WizardLang | undefined {
  const lang = i18n.language.split('-')[0];
  if (lang === 'zh') {
    return '简体中文';
  } else if (lang === 'en') {
    return 'English';
  }
  return undefined;
}
