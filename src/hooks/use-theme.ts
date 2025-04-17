import { useState } from 'react';
import { Theme } from '@/interface';
import useApp from '@/hooks/use-app';

export default function useTheme() {
  const app = useApp();
  const [theme, onTheme] = useState<Theme>(app.getTheme());
  const onToggleTheme = () => {
    onTheme(app.toggleTheme());
  };

  return { app, theme, onToggleTheme };
}
