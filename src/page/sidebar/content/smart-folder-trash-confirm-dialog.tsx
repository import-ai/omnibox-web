import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SmartFolderTrashConfirmDialogProps {
  open: boolean;
  retentionDays?: number;
  smartFolderName?: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function SmartFolderTrashConfirmDialog(
  props: SmartFolderTrashConfirmDialogProps
) {
  const { open, retentionDays, smartFolderName, onConfirm, onOpenChange } =
    props;
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="pb-2">
            {smartFolderName
              ? t('smart_folder.trash.named_title', {
                  name: smartFolderName,
                })
              : t('smart_folder.trash.title')}
          </DialogTitle>
          <DialogDescription>
            {t('smart_folder.trash.description', { days: retentionDays ?? 30 })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            className="cancel-btn-outline"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="text-destructive text-sm"
          >
            {t('ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
