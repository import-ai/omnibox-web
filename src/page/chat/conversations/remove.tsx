import { useState } from 'react';
import { http } from '@/lib/request';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';

interface IProps {
  data: {
    id: string;
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
      .then(onFinish)
      .finally(() => {
        onLoading(false);
      });
  };

  return (
    <AlertDialog open={data.open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('chat.delete_conversation')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('chat.delete_conversation_confirm')}
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
