import { Settings } from 'lucide-react';
import SettingWrapper from './swtting-wrapper';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
        </DialogHeader>
        <SettingWrapper />
      </DialogContent>
    </Dialog>
  );
}
