import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import EditForm from './form';

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
      <DialogContent className="w-[90%] sm:w-1/2 max-w-7xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {t('chat.conversations.rename.dialog.title')}
          </DialogTitle>
          <VisuallyHidden>
            <DialogDescription></DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <EditForm data={data} namespaceId={namespaceId} onFinish={onFinish} />
      </DialogContent>
    </Dialog>
  );
}
