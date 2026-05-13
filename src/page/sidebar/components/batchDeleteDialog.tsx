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
import { useTrashRetentionDays } from '@/page/sidebar/hooks/useTrashRetentionDays';

interface BatchDeleteDialogProps {
  open: boolean;
  selectedCount: number;
  namespaceId: string;
  loading?: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function BatchDeleteDialog({
  open,
  selectedCount,
  namespaceId,
  loading = false,
  onConfirm,
  onCancel,
}: BatchDeleteDialogProps) {
  const { t } = useTranslation();
  const trashRetentionDays = useTrashRetentionDays(namespaceId, open);

  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent className="w-[480px] max-w-[90%]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('batch.delete_title', { count: selectedCount })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('batch.delete_description', {
              days: trashRetentionDays,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            disabled={loading}
            className="cancel-btn-outline"
          >
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            className="border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={onConfirm}
            disabled={loading}
          >
            {t('batch.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
