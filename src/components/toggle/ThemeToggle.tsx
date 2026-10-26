import { Moon, Sun, SunMoon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/omnibox/IconButton';
import useTheme from '@/hooks/useTheme';
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
    <IconButton
      size="sm"
      tone="sidebar"
      label={t('toggle_theme')}
      onClick={handleToggleTheme}
    >
      {theme.skin === 'system' && <SunMoon className="size-4" />}
      {theme.skin === 'light' && <Sun className="size-4" />}
      {theme.skin === 'dark' && <Moon className="size-4" />}
    </IconButton>
  );
}
