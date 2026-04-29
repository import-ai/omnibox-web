import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const { open, retentionDays = 7, onConfirm, onOpenChange } = props;
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[520px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('smart_folder.trash.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('smart_folder.trash.description', { days: retentionDays })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cancel-btn-outline">
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('ok')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
