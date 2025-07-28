import { http } from '@/lib/request';
import useTheme from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Moon, Sun, SunMoon } from 'lucide-react';

export function ThemeToggle() {
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
