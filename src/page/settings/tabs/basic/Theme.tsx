import { Check, ChevronDown, SunMoon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import useTheme from '@/hooks/useTheme';
import { http } from '@/lib/request';

export default function Theme() {
  const { t } = useTranslation();
  const { theme, onToggleTheme } = useTheme();
  const data: Array<{
    label: string;
    value: 'light' | 'system' | 'dark';
  }> = [
    { label: t('manage.theme_light'), value: 'light' },
    { label: t('manage.theme_dark'), value: 'dark' },
    { label: t('manage.theme_system'), value: 'system' },
  ];
  const handleToggleTheme = (skin: 'light' | 'system' | 'dark') => {
    http.post('/user/option', {
      name: 'theme',
      value: onToggleTheme(skin),
    });
  };

  const selectedLabel =
    data.find(item => item.value === theme.skin)?.label ||
    t('setting.select_placeholder');

  return (
    <div className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
      <SunMoon className="size-4 text-muted-foreground" />
      <span className="min-w-0 text-sm font-medium leading-5 text-foreground">
        {t('manage.theme_setting')}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 w-[120px] justify-between rounded-md border-border bg-transparent px-2 font-normal shadow-none lg:w-[180px] lg:px-3"
          >
            <span className="text-sm font-normal text-foreground">
              {selectedLabel}
            </span>
            <ChevronDown className="size-4 text-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[120px] bg-popover lg:w-[180px]">
          {data.map(item => (
            <DropdownMenuItem
              key={item.value}
              className="flex justify-between focus:bg-accent"
              onClick={() => handleToggleTheme(item.value)}
            >
              {item.label}
              {item.value === theme.skin && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
