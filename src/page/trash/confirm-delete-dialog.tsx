import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/confirmDialog';

interface ConfirmPermanentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isClearAll?: boolean;
}

export function ConfirmPermanentDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isClearAll = false,
}: ConfirmPermanentDeleteDialogProps) {
  const { t } = useTranslation();

  const title = isClearAll
    ? t('trash.confirm.clear_title')
    : t('trash.confirm.single_title');
  const description = isClearAll
    ? t('trash.confirm.clear_description')
    : t('trash.confirm.single_description');

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmText={t('delete')}
      variant="destructive"
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
    />
  );
}
