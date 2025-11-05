import { Tags } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Switch } from '@/components/ui/switch';
import { http } from '@/lib/request';

export default function AutoTag() {
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const response = await http.get(
          '/user/option/enable_ai_tag_extraction'
        );
        if (response.data?.value !== undefined) {
          setIsEnabled(response.data.value === 'true');
        }
      } catch {
        // If option doesn't exist, default is enabled
        setIsEnabled(true);
      } finally {
        setLoading(false);
      }
    };
    loadPreference();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setIsEnabled(checked);
    try {
      await http.post('/user/option', {
        name: 'enable_ai_tag_extraction',
        value: checked ? 'true' : 'false',
      });
    } catch {
      setIsEnabled(!checked);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Tags className="size-4" />
          <span>{t('manage.auto_tag_setting')}</span>
        </div>
        <span className="text-xs text-muted-foreground ml-6">
          {t('manage.auto_tag_description')}
        </span>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
}
