import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { ConfirmInputDialog } from '@/components/confirm-input-dialog';
import { http } from '@/lib/request';

interface DeleteAccountDialogProps {
  username: string;
  trigger?: React.ReactNode;
}

export function DeleteAccountDialog({
  username,
  trigger,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
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

      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button
      variant="destructive"
      className="w-[71px] h-[30px] px-[21px] py-[5px] rounded-[5px] text-sm font-semibold"
    >
      {t('setting.delete_account.button')}
    </Button>
  );

  return (
    <ConfirmInputDialog
      open={open}
      onOpenChange={setOpen}
      title={t('setting.delete_account.title')}
      warningTitle={t('setting.delete_account.warning_title')}
      warningBody={t('setting.delete_account.warning_body')}
      confirmText={username}
      confirmLabel={t('setting.delete_account.confirm_label', { username })}
      confirmButtonText={t('setting.delete_account.confirm_button')}
      cancelButtonText={t('cancel')}
      loading={submitting}
      onConfirm={handleInitiateDeletion}
      trigger={trigger || defaultTrigger}
    />
  );
}
