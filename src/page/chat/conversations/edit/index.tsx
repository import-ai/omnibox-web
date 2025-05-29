import EditForm from './form';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface IProps {
  data: {
    id: string;
    title: string;
    open: boolean;
  };
  onFinish: () => void;
  namespaceId: string;
  onOpenChange: (open: boolean) => void;
}

export default function editHistory(props: IProps) {
  const { data, namespaceId, onFinish, onOpenChange } = props;
  const { t } = useTranslation();

  return (
    <Dialog open={data.open} onOpenChange={onOpenChange}>
      <DialogContent className="w-1/2 max-w-7xl">
        <DialogHeader>
          <DialogTitle>{t('chat.edit_conversation_name')}</DialogTitle>
        </DialogHeader>
        <EditForm data={data} namespaceId={namespaceId} onFinish={onFinish} />
      </DialogContent>
    </Dialog>
  );
}
