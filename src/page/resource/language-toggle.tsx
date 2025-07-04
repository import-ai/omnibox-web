import { useEffect } from 'react';
import { http } from '@/lib/request';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const toggleLanguage = () => {
    const currentLang = i18n.language || navigator.language;
    const newLanguage = currentLang === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLanguage).then(() => {
      http.post('/user/option', {
        name: 'language',
        value: newLanguage === 'en' ? 'en-US' : 'zh-CN',
      });
    });
  };

  useEffect(() => {
    http.get('/user/option/language').then((response) => {
      if (!response || !response.value) {
        return;
      }
      const lng = response.value === 'en-US' ? 'en' : 'zh';
      if (lng !== i18n.language) {
        i18n.changeLanguage(lng);
      }
    });
  }, [i18n]);

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7 "
      onClick={toggleLanguage}
      aria-label="Switch Language"
    >
      <Languages />
    </Button>
  );
}
