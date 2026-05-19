import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/confirmDialog';
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
    <ConfirmDialog
      open={open}
      title={t('batch.delete_title', { count: selectedCount })}
      description={t('batch.delete_description', {
        days: trashRetentionDays,
      })}
      confirmText={t('batch.delete')}
      loading={loading}
      variant="destructive"
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          onCancel();
        }
      }}
      onConfirm={onConfirm}
    />
  );
}
