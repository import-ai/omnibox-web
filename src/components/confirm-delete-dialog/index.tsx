import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
} from '@/components/ui/alert-dialog';
import { http } from '@/lib/request';

interface IProps {
  open: boolean;
  titleKey?: string;
  descriptionKey?: string;
  targetName: string;
  itemTitle: string;
  deleteUrl: string;
  restoreUrl?: string;
  successMessage?: string;
  successDescription?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onRestoreSuccess?: (response?: any) => void;
  onError?: (error: any) => void;
}

export default function ConfirmDeleteDialog(props: IProps) {
  const {
    open,
    titleKey,
    targetName,
    descriptionKey,
    itemTitle,
    deleteUrl,
    restoreUrl,
    successMessage,
    successDescription,
    onOpenChange,
    onSuccess,
    onRestoreSuccess,
    onError,
  } = props;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = () => {
    setLoading(true);
    http
      .delete(deleteUrl)
      .then(() => {
        onOpenChange(false);
        onSuccess?.();

        // show success message
        const toastOptions: any = {
          description: successDescription,
        };

        // if restore url is provided, add undo function
        if (restoreUrl) {
          toastOptions.action = {
            label: t('undo'),
            onClick: () => {
              http.post(restoreUrl).then(response => {
                if (onRestoreSuccess) {
                  onRestoreSuccess(response);
                } else {
                  onSuccess?.();
                }
              });
            },
          };
        }

        toast(successMessage, toastOptions);
      })
      .catch(error => {
        onError?.(error);
        toast.error(t('error.title'), {
          description: error.message || t('request.failed'),
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans
              i18nKey={titleKey || 'common.dialog.delete.title'}
              values={{ target_name: targetName }}
            />
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans
              i18nKey={descriptionKey || 'common.dialog.delete.description'}
              values={{ title: itemTitle }}
              components={{
                strong: <strong className="font-bold" />,
              }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={handleConfirm}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
