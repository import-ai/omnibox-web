export function detectBrowserLanguage(): 'en' | 'zh' {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const browserLang = navigator.language;
  if (browserLang && browserLang.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}
