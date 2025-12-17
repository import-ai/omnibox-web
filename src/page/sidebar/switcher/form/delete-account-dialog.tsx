import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [confirmUsername, setConfirmUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleInitiateDeletion = async () => {
    if (confirmUsername !== username) {
      toast.error(t('setting.delete_account.username_mismatch'), {
        position: 'bottom-right',
      });
      return;
    }

    setSubmitting(true);
    try {
      await http.post('/user/account/delete/initiate', {
        username: confirmUsername,
      });

      toast.success(t('setting.delete_account.email_sent'), {
        position: 'bottom-right',
        duration: 6000,
      });

      setOpen(false);
      setConfirmUsername('');
    } catch (error: any) {
      // Error already handled by http interceptor
      // Special handling for owner with members error
      if (error?.response?.data?.code === 'cannot_delete_owner_with_members') {
        toast.error(t('setting.delete_account.owner_with_members_error'), {
          position: 'bottom-right',
          duration: 8000,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button variant="destructive" className="w-full">
      {t('setting.delete_account.button')}
    </Button>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('setting.delete_account.title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="font-semibold text-destructive">
                {t('setting.delete_account.warning_title')}
              </p>
              <p className="text-sm mt-2 text-foreground">
                {t('setting.delete_account.warning_body')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-username">
                {t('setting.delete_account.confirm_label', { username })}
              </Label>
              <Input
                id="confirm-username"
                value={confirmUsername}
                onChange={e => setConfirmUsername(e.target.value)}
                placeholder={username}
                disabled={submitting}
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting || confirmUsername !== username}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={e => {
              e.preventDefault();
              handleInitiateDeletion();
            }}
          >
            {submitting && (
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {t('setting.delete_account.confirm_button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
