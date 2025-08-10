import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import SettingWrapper from './swtting-wrapper';

export default function Setting() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-muted-foreground h-7 gap-1 px-2"
        >
          <Settings />
          {t('setting.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90%] sm:w-4/5 max-w-7xl p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t('setting.preferences')}</DialogTitle>
          <VisuallyHidden>
            <DialogDescription></DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <SettingWrapper />
      </DialogContent>
    </Dialog>
  );
}
