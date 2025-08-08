import { http } from '@/lib/request';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Earth } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Language() {
  const { i18n, t } = useTranslation();
  const data = [
    { label: '简体中文', value: 'zh' },
    { label: 'English', value: 'en' },
  ];
  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang).then(() => {
      http.post('/user/option', {
        name: 'language',
        value: lang === 'en' ? 'en-US' : 'zh-CN',
      });
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Earth className="size-4" />
        <span>{t('manage.language_setting')}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="font-normal w-40 justify-between"
          >
            {data.find(item => item.value === i18n.language)?.label}
            <ChevronDown className="size-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {data.map(item => (
            <DropdownMenuItem
              key={item.value}
              className="flex justify-between"
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
