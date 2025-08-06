import { toast } from 'sonner';
import { useState } from 'react';
import { http } from '@/lib/request';
import { LoaderCircle } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
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

interface IProps {
  data: {
    id: string;
    title: string;
    open: boolean;
  };
  namespaceId: string;
  onFinish: () => void;
  onOpenChange: (open: boolean) => void;
}

export default function RemoveHistory(props: IProps) {
  const { data, namespaceId, onFinish, onOpenChange } = props;
  const { t } = useTranslation();
  const [loading, onLoading] = useState(false);
  const handleCancel = () => {
    onOpenChange(false);
  };
  const handleRemove = () => {
    onLoading(true);
    http
      .delete(`namespaces/${namespaceId}/conversations/${data.id}`)
      .then(() => {
        onFinish();
        toast(t('chat.conversations.deleted'), {
          description: t('chat.conversations.deleted_description'),
          action: {
            label: t('undo'),
            onClick: () => {
              http
                .post(
                  `/namespaces/${namespaceId}/conversations/${data.id}/restore`
                )
                .then(onFinish);
            },
          },
        });
      })
      .finally(() => {
        onLoading(false);
      });
  };

  return (
    <AlertDialog open={data.open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('chat.conversations.delete.dialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans
              i18nKey="chat.conversations.delete.dialog.description"
              values={{ title: data.title }}
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
            onClick={handleRemove}
            className="bg-red-500 text-white"
          >
            {loading && (
              <LoaderCircle className="transition-transform animate-spin" />
            )}
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
