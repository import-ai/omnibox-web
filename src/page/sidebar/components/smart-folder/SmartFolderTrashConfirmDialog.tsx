import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';

interface SmartFolderTrashConfirmDialogProps {
  open: boolean;
  retentionDays?: number;
  count?: number;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function SmartFolderTrashConfirmDialog(
  props: SmartFolderTrashConfirmDialogProps
) {
  const { open, retentionDays, count = 1, onConfirm, onOpenChange } = props;
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        outsideCloseTrackName="sidebar_overlay_close"
        outsideCloseTarget="smart_folder"
        className="max-w-[520px] sm:max-w-[520px] [&>button]:hidden"
      >
        <DialogHeader>
          <DialogTitle className="pb-2">
            {t('smart_folder.trash.title', { count })}
          </DialogTitle>
          <DialogDescription>
            {t('smart_folder.trash.description', { days: retentionDays ?? 30 })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            trackName="sidebar_folder_cancel"
            variant="outline"
            className="cancel-btn-outline"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            trackName="sidebar_folder_delete"
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {t('ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
