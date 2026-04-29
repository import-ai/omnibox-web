import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MoveConfirmDialogProps {
  open: boolean;
  count: number;
  targetName: string;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function MoveConfirmDialog({
  open,
  count,
  targetName,
  onConfirm,
  onOpenChange,
}: MoveConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('batch.move_confirm_title')}</DialogTitle>
          <DialogDescription>
            {t('batch.move_confirm_description', {
              count,
              target: targetName,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={onConfirm}>{t('batch.move_confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
