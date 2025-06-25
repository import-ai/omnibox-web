import { cn } from '@/lib/utils';
import useTheme from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { MonitorSmartphone } from 'lucide-react';

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
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MonitorSmartphone className="size-5" />
        <span className="font-medium">{t('manage.theme_setting')}</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {data.map((item) => (
          <Card
            key={item.value}
            onClick={() => onToggleTheme(item.value)}
            className={cn(
              'border px-4 py-6 flex flex-col items-center cursor-pointer bg-[#F9F9F9]',
              {
                'border-blue-500': theme.skin === item.value,
                'border-gray-200': theme.skin !== item.value,
              },
            )}
          >
            <div className="w-full mb-1">
              <img alt={item.value} src={`/assets/${item.value}.png`} />
            </div>
            <span className="text-sm">{item.label}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
