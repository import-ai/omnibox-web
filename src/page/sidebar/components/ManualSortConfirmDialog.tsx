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
} from '@/components/ui/AlertDialog';

interface ManualSortConfirmDialogProps {
  open: boolean;
  loading: boolean;
  hasExistingManualSort: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  spaceName: string;
}

export function ManualSortConfirmDialog({
  open,
  loading,
  hasExistingManualSort,
  onCancel,
  onConfirm,
  spaceName,
}: ManualSortConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="w-[85%] max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('sidebar.sort.confirm_title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              hasExistingManualSort
                ? 'sidebar.sort.confirm_description'
                : 'sidebar.sort.confirm_initial_description',
              { space: spaceName }
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={onCancel}>
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={event => {
              event.preventDefault();
              void onConfirm();
            }}
          >
            {t('sidebar.sort.confirm_action')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
