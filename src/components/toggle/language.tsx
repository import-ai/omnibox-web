import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { http } from '@/lib/request';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const toggleLanguage = () => {
    const currentLang = i18n.language || navigator.language;
    const newLanguage = currentLang === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLanguage).then(() => {
      if (!localStorage.getItem('uid')) {
        return;
      }
      http.post('/user/option', {
        name: 'language',
        value: newLanguage === 'en' ? 'en-US' : 'zh-CN',
      });
    });
  };

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
