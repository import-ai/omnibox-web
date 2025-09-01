import i18n from 'i18next';
type wizardLang = '简体中文' | 'English';

export function getWizardLang(): wizardLang | undefined {
  const currentLang: string = i18n.language;
  if (currentLang === 'zh') {
    return '简体中文';
  } else if (currentLang === 'en') {
    return 'English';
  }
  return undefined;
}
