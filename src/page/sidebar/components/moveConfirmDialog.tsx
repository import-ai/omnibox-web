import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/confirmDialog';

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
    <ConfirmDialog
      open={open}
      title={t('batch.move_confirm_title', {
        count,
        target: targetName,
      })}
      description={t('batch.move_confirm_description')}
      confirmText={t('batch.move_confirm')}
      loading={loading}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
