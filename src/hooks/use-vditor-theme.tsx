import React from 'react';
import { useTheme } from '@/components/provider/theme-provider';

export type VditorTheme = {
  theme: 'dark' | 'classic';
  contentTheme: 'light' | 'dark';
  codeTheme: 'github' | 'github-dark';
};

export function useVditorTheme(): VditorTheme {
  const { theme } = useTheme();

  return React.useMemo<VditorTheme>((): VditorTheme => {
    const currentTheme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme === 'dark'
        ? 'dark'
        : 'light';
    return {
      theme: currentTheme === 'dark' ? 'dark' : 'classic',
      contentTheme: currentTheme,
      codeTheme: currentTheme === 'dark' ? 'github-dark' : 'github',
    };
  }, [theme]);
}
