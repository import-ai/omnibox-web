import { SunMoon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import useTheme from '@/hooks/useTheme';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

type ThemeSkin = 'light' | 'system' | 'dark';

function ThemePreview({
  skin,
  selected,
}: {
  skin: ThemeSkin;
  selected: boolean;
}) {
  const isDark = skin === 'dark';
  const isSystem = skin === 'system';

  return (
    <span
      aria-hidden
      className={cn(
        'relative block aspect-[1.35] w-full overflow-hidden rounded-md border p-1 transition-colors',
        selected ? 'border-ring ring-1 ring-ring' : 'border-border',
        isDark ? 'bg-neutral-900' : 'bg-white'
      )}
    >
      {isSystem ? (
        <span className="absolute inset-0 grid grid-cols-2">
          <span className="bg-white" />
          <span className="bg-neutral-900" />
        </span>
      ) : null}
      <span
        className={cn(
          'absolute inset-2 rounded-[4px] border p-1.5 shadow-sm',
          isDark
            ? 'border-neutral-600 bg-neutral-800'
            : 'border-neutral-100 bg-white'
        )}
      >
        <span
          className={cn(
            'mb-1 block h-1 w-1/2 rounded-full',
            isDark ? 'bg-neutral-400' : 'bg-neutral-300'
          )}
        />
        <span
          className={cn(
            'mb-1 block h-1 w-3/4 rounded-full',
            isDark ? 'bg-neutral-600' : 'bg-neutral-100'
          )}
        />
        <span
          className={cn(
            'block h-1 w-2/3 rounded-full',
            isDark ? 'bg-neutral-600' : 'bg-neutral-100'
          )}
        />
      </span>
    </span>
  );
}

export default function Theme() {
  const { t } = useTranslation();
  const { theme, onToggleTheme } = useTheme();
  const data: Array<{ label: string; value: ThemeSkin }> = [
    { label: t('manage.theme_system'), value: 'system' },
    { label: t('manage.theme_light'), value: 'light' },
    { label: t('manage.theme_dark'), value: 'dark' },
  ];
  const handleToggleTheme = (skin: 'light' | 'system' | 'dark') => {
    http.post('/user/option', {
      name: 'theme',
      value: onToggleTheme(skin),
    });
  };

  return (
    <div className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
      <SunMoon className="size-4 text-muted-foreground" />
      <span className="min-w-0 text-sm font-medium leading-5 text-foreground">
        {t('manage.theme_setting')}
      </span>
      <div className="flex w-[216px] gap-2 lg:w-[240px]">
        {data.map(item => {
          const selected = item.value === theme.skin;
          return (
            <Button
              key={item.value}
              type="button"
              variant="ghost"
              aria-pressed={selected}
              className={cn(
                'h-auto min-w-0 flex-1 flex-col gap-1 rounded-md p-0 text-xs font-normal hover:bg-transparent!',
                selected
                  ? 'cursor-default text-foreground'
                  : 'cursor-pointer text-muted-foreground hover:text-foreground'
              )}
              onClick={() => handleToggleTheme(item.value)}
            >
              <ThemePreview skin={item.value} selected={selected} />
              <span>{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
