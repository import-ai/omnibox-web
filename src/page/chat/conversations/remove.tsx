import { useTranslation } from 'react-i18next';

import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';

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

  return (
    <ConfirmDeleteDialog
      open={data.open}
      targetName={t('chat.conversations.name')}
      itemTitle={data.title}
      deleteUrl={`namespaces/${namespaceId}/conversations/${data.id}`}
      restoreUrl={`/namespaces/${namespaceId}/conversations/${data.id}/restore`}
      successMessage={t('chat.conversations.deleted')}
      successDescription={t('chat.conversations.deleted_description')}
      onOpenChange={onOpenChange}
      onSuccess={onFinish}
    />
  );
}
