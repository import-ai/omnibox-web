import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ConfirmInputDialog } from '@/components/confirm-input-dialog';
import { http } from '@/lib/request';

interface DeleteAccountDialogProps {
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  username,
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const handleInitiateDeletion = async () => {
    setSubmitting(true);
    try {
      await http.post('/user/account/delete/initiate', {
        username,
        url: `${window.location.origin}/user/account/delete/confirm`,
      });

      toast.success(t('setting.delete_account.email_sent'), {
        position: 'bottom-right',
        duration: 6000,
      });

      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ConfirmInputDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('setting.delete_account.title')}
      warningTitle={t('setting.delete_account.warning_title')}
      warningBody={t('setting.delete_account.warning_body')}
      confirmText={username}
      confirmLabel={t('setting.delete_account.confirm_label', { username })}
      confirmButtonText={t('setting.delete_account.confirm_button')}
      cancelButtonText={t('cancel')}
      loading={submitting}
      onConfirm={handleInitiateDeletion}
    />
  );
}
