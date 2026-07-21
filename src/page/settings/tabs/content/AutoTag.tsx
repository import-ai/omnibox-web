import { Tags } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Switch } from '@/components/ui/Switch';
import { http } from '@/lib/request';

export default function AutoTag() {
  const { t } = useTranslation();
  // Default to true (enabled) to match backend default behavior
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreference = async () => {
      let enabled = true;
      try {
        const response = await http.get(
          '/user/option/enable_ai_tag_extraction'
        );
        // Use backend value if valid, otherwise keep default (enabled)
        if (response?.value != null && response.value !== '') {
          enabled = response.value === 'true' || response.value === true;
        }
      } catch {
        // Option doesn't exist (404) or other error, use default
      }
      setIsEnabled(enabled);
      // Save default to backend if not exists
      if (enabled) {
        try {
          await http.post('/user/option', {
            name: 'enable_ai_tag_extraction',
            value: 'true',
          });
        } catch {
          // Ignore save error
        }
      }
      setLoading(false);
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
      // Revert on error
      setIsEnabled(!checked);
    }
  };

  return (
    <div className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
      <Tags className="size-4 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-5 text-foreground">
          {t('manage.auto_tag_setting')}
        </span>
        <span className="block whitespace-normal text-xs leading-4 text-muted-foreground">
          {t('manage.auto_tag_description')}
        </span>
      </span>
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={loading}
        className="shrink-0"
      />
    </div>
  );
}
