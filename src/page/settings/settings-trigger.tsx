import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import useApp from '@/hooks/use-app';

export function SettingButton() {
  const { t } = useTranslation();
  const app = useApp();

  const handleClick = () => {
    app.fire('open_settings', {});
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-full justify-start gap-1 px-2 font-medium text-muted-foreground"
      onClick={handleClick}
    >
      <Settings />
      {t('setting.title')}
    </Button>
  );
}
