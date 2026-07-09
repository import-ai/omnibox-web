import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

interface H5LaunchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function H5LaunchDialog(props: H5LaunchDialogProps) {
  const { open, onOpenChange, onConfirm } = props;
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('login.wechat_h5_title')}</DialogTitle>
          <DialogDescription>
            {t('login.wechat_h5_description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('login.wechat_h5_cancel')}
          </Button>
          <Button onClick={onConfirm}>{t('login.wechat_h5_confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
