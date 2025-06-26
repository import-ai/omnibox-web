import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Language() {
  const { i18n, t } = useTranslation();
  const data = [
    { label: 'English', value: 'en' },
    { label: '简体中文', value: 'zh' },
  ];

  return (
    <div className="flex items-center gap-24">
      <div className="flex items-center gap-2">
        <Globe className="size-5" />
        <span className="font-medium">{t('manage.language_setting')}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            {data.find((item) => item.value === i18n.language)?.label}
            <ChevronDown className="size-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {data.map((item) => (
            <DropdownMenuItem
              key={item.value}
              className="flex justify-between"
              onClick={() => i18n.changeLanguage(item.value)}
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
