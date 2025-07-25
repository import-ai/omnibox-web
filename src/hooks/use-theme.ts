import { useEffect, useState } from 'react';
import { Theme } from '@/interface';
import useApp from '@/hooks/use-app';

export default function useTheme() {
  const app = useApp();
  const [theme, onTheme] = useState<Theme>(app.getTheme());
  const onToggleTheme = (skin?: 'light' | 'system' | 'dark') => {
    const state = app.toggleTheme(skin);
    app.fire('theme-toggle', { ...state });
    return state.skin;
  };

  useEffect(() => {
    return app.on('theme-toggle', onTheme);
  }, []);

  return { app, theme, onToggleTheme };
}
