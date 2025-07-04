import useTheme from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Check, PanelTop, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <PanelTop className="size-4" />
        <span>{t('manage.theme_setting')}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="font-normal w-40 justify-between"
          >
            {data.find((item) => item.value === theme.skin)?.label}
            <ChevronDown className="size-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {data.map((item) => (
            <DropdownMenuItem
              key={item.value}
              className="flex justify-between"
              onClick={() => onToggleTheme(item.value)}
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
