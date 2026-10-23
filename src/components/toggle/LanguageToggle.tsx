import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { sidebarToolbarIconButtonClassName } from '@/components/omnibox/IconButton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const toggleLanguage = () => {
    const lang = i18n.language === 'en-US' ? 'zh-CN' : 'en-US';
    i18n.changeLanguage(lang).then(() => {
      if (!localStorage.getItem('uid')) {
        return;
      }
      http.post('/user/option', {
        name: 'language',
        value: lang,
      });
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={cn(sidebarToolbarIconButtonClassName, 'size-7')}
            onClick={toggleLanguage}
            aria-label="Switch Language"
          >
            <Languages />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('toggle_language')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
