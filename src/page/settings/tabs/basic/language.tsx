import { Check, ChevronDown, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { http } from '@/lib/request';

export default function Language() {
  const { i18n, t } = useTranslation();
  const data = [
    { label: '简体中文', value: 'zh-CN' },
    { label: 'English', value: 'en-US' },
  ];
  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang).then(() => {
      http.post('/user/option', {
        name: 'language',
        value: lang,
      });
    });
  };

  const selectedLabel =
    data.find(item => item.value === i18n.language)?.label ||
    t('setting.select_placeholder');

  return (
    <div className="flex h-10 w-full items-center justify-between gap-2">
      <div className="flex shrink-0 items-center gap-2 lg:gap-2.5">
        <Languages className="size-4 dark:text-neutral-50 lg:size-5" />
        <span className="whitespace-nowrap text-sm font-semibold text-foreground lg:text-base">
          {t('manage.language_setting')}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 w-[120px] justify-between rounded-md border-border bg-transparent px-2 font-normal shadow-none lg:h-9 lg:w-[180px] lg:px-3"
          >
            <span className="text-xs font-normal text-neutral-950 dark:text-neutral-50 lg:text-sm">
              {selectedLabel}
            </span>
            <ChevronDown className="size-4 text-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[120px] dark:bg-neutral-900 lg:w-[180px]">
          {data.map(item => (
            <DropdownMenuItem
              key={item.value}
              className="flex justify-between dark:focus:bg-neutral-700"
              onClick={() => toggleLanguage(item.value)}
            >
              {item.label}
              {item.value === i18n.language && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
