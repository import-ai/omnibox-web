import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const toggleLanguage = () => {
    const currentLang = i18n.language || navigator.language;
    const newLanguage = currentLang === 'en-US' ? 'zh-CN' : 'en-US';
    i18n.changeLanguage(newLanguage).then(() => {
      localStorage.setItem('preferred_language', newLanguage);
      toast(t('toggle.title'), {
        position: 'top-center',
        description: t('toggle.lang.name'),
      });
    });
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language');
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang).then();
    }
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
