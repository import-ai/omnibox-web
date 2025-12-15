import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useApp from '@/hooks/use-app';

import SettingWrapper from './setting-wrapper';

interface OpenSettingsPayload {
  tab?: string;
  autoAction?: {
    type: 'bind';
    appId: string;
  };
}

// Dialog component with event listener (always mounted)
export default function Setting() {
  const { t } = useTranslation();
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<string | undefined>();
  const [autoAction, setAutoAction] =
    useState<OpenSettingsPayload['autoAction']>();

  useEffect(() => {
    return app.on('open_settings', (payload: OpenSettingsPayload) => {
      setInitialTab(payload.tab);
      setAutoAction(payload.autoAction);
      setOpen(true);
    });
  }, [app]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setInitialTab(undefined);
      setAutoAction(undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col w-[90vw] sm:w-[85vw] lg:w-[858px] max-w-[858px] h-[85vh] sm:h-[80vh] lg:h-[517px] max-h-[517px] p-0 rounded-[12px] overflow-hidden gap-0 border-0 [&>button]:hidden">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>{t('setting.preferences')}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <SettingWrapper
          initialTab={initialTab}
          autoAction={autoAction}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// Button component (used in dropdown)
export function SettingButton() {
  const { t } = useTranslation();
  const app = useApp();

  const handleClick = () => {
    app.fire('open_settings', {});
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-muted-foreground h-7 gap-1 px-2"
      onClick={handleClick}
    >
      <Settings />
      {t('setting.title')}
    </Button>
  );
}
