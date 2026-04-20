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
      className="text-muted-foreground font-medium px-2 h-8 gap-1 justify-start w-full"
      onClick={handleClick}
    >
      <Settings />
      {t('setting.title')}
    </Button>
  );
}
