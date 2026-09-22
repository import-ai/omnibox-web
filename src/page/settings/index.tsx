import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import useApp from '@/hooks/useApp';

import SettingWrapper from './SettingWrapper';

interface OpenSettingsPayload {
  tab?: string;
  autoAction?:
    | {
        type: 'bind';
        appId: string;
      }
    | {
        type: 'bind_phone';
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

  const closeSettings = () => {
    setOpen(false);
    setInitialTab(undefined);
    setAutoAction(undefined);
    app.fire('close_settings');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setOpen(true);
      return;
    }
    closeSettings();
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
          onClose={closeSettings}
        />
      </DialogContent>
    </Dialog>
  );
}
