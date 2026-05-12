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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cancel-btn-outline">
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            className="border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleConfirm}
          >
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
