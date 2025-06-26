import { toast } from 'sonner';
import { useEffect } from 'react';
import { http } from '@/lib/request';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const toggleLanguage = () => {
    const currentLang = i18n.language || navigator.language;
    const newLanguage = currentLang === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLanguage).then(() => {
      toast(t('toggle.title'), {
        position: 'top-center',
        description: t('toggle.lang.name'),
      });
    });
  };

  useEffect(() => {
    http.get('/user/option/language').then((response) => {
      if (!response || !response.value) {
        return;
      }
      if (response.value !== i18n.language) {
        i18n.changeLanguage(response.value);
      }
    });
    const languageChangedFN = (lang: string) => {
      http.post(
        '/user/option',
        {
          name: 'language',
          value: lang,
        },
        { mute: true },
      );
    };
    i18n.on('languageChanged', languageChangedFN);
    return () => {
      i18n.off('languageChanged', languageChangedFN);
    };
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
