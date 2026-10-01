import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
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
    <div className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
      <Languages className="size-4 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-5 text-foreground">
          {t('manage.language_setting')}
        </span>
        <span className="block whitespace-normal text-xs leading-4 text-muted-foreground">
          {t('manage.language_description')}
        </span>
      </span>

      <Select value={i18n.language} onValueChange={toggleLanguage}>
        <SelectTrigger className="w-[120px] px-2 lg:w-[180px] lg:px-3">
          <SelectValue placeholder={selectedLabel} />
        </SelectTrigger>
        <SelectContent position="popper" className="w-[120px] lg:w-[180px]">
          {data.map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
