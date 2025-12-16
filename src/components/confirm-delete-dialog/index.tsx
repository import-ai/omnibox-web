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
import { Spinner } from '@/components/ui/spinner';
import { http } from '@/lib/request';

interface IProps {
  open: boolean;
  titleKey?: string;
  descriptionKey?: string;
  targetName?: string;
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

  const targetTitle = (itemTitle: string) => {
    if (itemTitle.length > 50) {
      return itemTitle.slice(0, 10) + '...' + itemTitle.slice(-10);
    }
    return itemTitle;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[85%] max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey={titleKey || 'common.dialog.delete.title'} />
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans
              i18nKey={descriptionKey || 'common.dialog.delete.description'}
              values={{ title: targetTitle(itemTitle) }}
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
            {loading && <Spinner className="mr-2" />}
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
