import { useTranslation } from 'react-i18next';

import { AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SmartFolderUnsavedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SmartFolderUnsavedDialog(props: SmartFolderUnsavedDialogProps) {
  const { open, onOpenChange, onConfirm } = props;
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[560px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('smart_folder.create.unsaved_title')}
          </AlertDialogTitle>
          <AlertDescription className="text-muted-foreground text-sm">
            {t('smart_folder.create.unsaved_description')}
          </AlertDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cancel-btn-outline">
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('ok')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
