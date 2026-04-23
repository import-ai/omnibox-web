import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useApp from '@/hooks/use-app';

import SettingWrapper from './settings-layout';

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
      <DialogContent className="flex h-[85vh] max-h-[517px] w-[90vw] max-w-[858px] flex-col gap-0 overflow-hidden !rounded-[12px] border-0 p-0 sm:h-[80vh] sm:w-[85vw] lg:h-[517px] lg:w-[858px] [&>button]:hidden">
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
