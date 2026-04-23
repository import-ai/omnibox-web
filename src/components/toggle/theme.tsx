import { Moon, Sun, SunMoon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import useTheme from '@/hooks/use-theme';
import { http } from '@/lib/request';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, onToggleTheme } = useTheme();
  const handleToggleTheme = () => {
    if (!localStorage.getItem('uid')) {
      onToggleTheme();
      return;
    }
    http.post('/user/option', {
      name: 'theme',
      value: onToggleTheme(),
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={handleToggleTheme}
          >
            {theme.skin === 'system' && <SunMoon />}
            {theme.skin === 'light' && <Sun />}
            {theme.skin === 'dark' && <Moon />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('toggle_theme')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
