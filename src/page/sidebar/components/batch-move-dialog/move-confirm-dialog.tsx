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
  loading?: boolean;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function MoveConfirmDialog({
  open,
  count,
  targetName,
  loading = false,
  onConfirm,
  onOpenChange,
}: MoveConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('batch.move_confirm_title', {
              count,
              target: targetName,
            })}
          </DialogTitle>
          <DialogDescription>
            {t('batch.move_confirm_description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button disabled={loading} onClick={onConfirm}>
            {t('batch.move_confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
