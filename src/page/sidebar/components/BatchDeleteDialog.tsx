import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTrashRetentionDays } from '@/page/sidebar/hooks/useTrashRetentionDays';
import type { BatchSelectionSummary } from '@/page/sidebar/store/utils';

interface BatchDeleteDialogProps {
  open: boolean;
  selection: BatchSelectionSummary;
  namespaceId: string;
  loading?: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function BatchDeleteDialog({
  open,
  selection,
  namespaceId,
  loading = false,
  onConfirm,
  onCancel,
}: BatchDeleteDialogProps) {
  const { t } = useTranslation();
  const trashRetentionDays = useTrashRetentionDays(namespaceId, open);
  const titleKey = selection.hasOnlySmartFolders
    ? 'batch.delete_smart_folder_title'
    : 'batch.delete_title';
  const descriptionKey = selection.hasOnlySmartFolders
    ? 'batch.delete_smart_folder_description'
    : selection.isMixed
      ? 'batch.delete_mixed_description'
      : 'batch.delete_description';

  return (
    <ConfirmDialog
      open={open}
      title={t(titleKey, { count: selection.selectedCount })}
      description={t(descriptionKey, {
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
