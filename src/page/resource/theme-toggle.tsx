import { useEffect } from 'react';
import { http } from '@/lib/request';
import useTheme from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Moon, Sun, SunMoon } from 'lucide-react';

export function ThemeToggle() {
  const { app, theme, onToggleTheme } = useTheme();
  const handleToggleTheme = () => {
    onToggleTheme();
  };

  useEffect(() => {
    http.get('/user/option/theme').then((response) => {
      if (!response || !response.value) {
        return;
      }
      const cuttentTheme = app.getTheme();
      if (response.value !== cuttentTheme.skin) {
        onToggleTheme();
      }
    });
    return app.on('themeChanged', (theme: string) => {
      http.post(
        '/user/option',
        {
          name: 'theme',
          value: theme,
        },
        { mute: true },
      );
    });
  }, []);

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7"
      onClick={handleToggleTheme}
    >
      {theme.skin === 'system' && <SunMoon />}
      {theme.skin === 'light' && <Sun />}
      {theme.skin === 'dark' && <Moon />}
    </Button>
  );
}
