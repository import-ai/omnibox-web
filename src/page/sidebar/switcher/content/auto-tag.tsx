import { Tags } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Switch } from '@/components/ui/switch';
import { http } from '@/lib/request';

export default function AutoTag() {
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [submitting] = useState(false);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const response = await http.get(
          '/user/option/enable_ai_tag_extraction'
        );
        setIsEnabled(response.value === 'true');
      } catch {
        // If option doesn't exist, default is enabled
        setIsEnabled(true);
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
    <div className="flex w-full items-center justify-between">
      <div className="flex items-start gap-2">
        <Tags className="size-5 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-2">
          <span className="text-base font-semibold text-foreground">
            {t('manage.auto_tag_setting')}
          </span>
          <span className="text-sm text-muted-foreground">
            {t('manage.auto_tag_description')}
          </span>
        </div>
      </div>
      {isEnabled !== null && (
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={submitting}
        />
      )}
    </div>
  );
}
