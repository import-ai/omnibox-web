import { Check, ChevronDown } from 'lucide-react';

import { AppearanceIcon } from '@/components/icons/appearance-icon';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useTheme from '@/hooks/use-theme';
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
    <div className="flex h-10 w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <AppearanceIcon className="text-muted-foreground" />
        <span className="whitespace-nowrap text-base font-semibold text-foreground">
          {t('manage.theme_setting')}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-9 w-[180px] justify-between rounded-md border-border bg-background px-3 font-normal shadow-none"
          >
            <span className="text-sm font-normal text-muted-foreground">
              {selectedLabel}
            </span>
            <ChevronDown className="size-4 text-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[180px]">
          {data.map(item => (
            <DropdownMenuItem
              key={item.value}
              className="flex justify-between"
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
