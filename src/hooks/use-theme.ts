import { useEffect, useState } from 'react';
import { Theme } from '@/interface';
import useApp from '@/hooks/use-app';

export default function useTheme() {
  const app = useApp();
  const [theme, onTheme] = useState<Theme>(app.getTheme());
  const onToggleTheme = () => {
    const state = app.toggleTheme();
    app.fire('theme-toggle', { ...state });
  };

  useEffect(() => {
    return app.on('theme-toggle', onTheme);
  }, []);

  return { app, theme, onToggleTheme };
}
