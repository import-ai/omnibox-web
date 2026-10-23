import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import useApp from '@/hooks/useApp';

export function SettingButton({ onOpen }: { onOpen?: () => void }) {
  const { t } = useTranslation();
  const app = useApp();

  const handleClick = () => {
    onOpen?.();
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
