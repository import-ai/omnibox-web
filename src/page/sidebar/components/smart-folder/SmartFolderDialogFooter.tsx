import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';

interface SmartFolderDialogFooterProps {
  canSubmit: boolean;
  confirmText?: string;
  name: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SmartFolderDialogFooter(props: SmartFolderDialogFooterProps) {
  const { canSubmit, confirmText, name, submitting, onCancel, onConfirm } =
    props;
  const { t } = useTranslation();

  return (
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:space-x-2">
      <Button
        variant="outline"
        className="h-9 w-full rounded-lg px-4 sm:w-auto"
        onClick={onCancel}
        disabled={submitting}
      >
        {t('cancel')}
      </Button>
      <Button
        className="h-9 w-full rounded-lg px-4 sm:w-auto"
        onClick={onConfirm}
        disabled={!name.trim() || !canSubmit || submitting}
        loading={submitting}
      >
        {confirmText || t('create')}
      </Button>
    </div>
  );
}
