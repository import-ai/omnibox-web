import useTheme from '@/hooks/use-theme';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, onToggleTheme } = useTheme();
  const handleToggle = () => {
    onToggleTheme();
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7"
      onClick={handleToggle}
    >
      {theme.skin === 'light' ? <Sun /> : <Moon />}
    </Button>
  );
}
