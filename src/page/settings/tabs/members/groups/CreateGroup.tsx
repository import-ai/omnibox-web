import { VisuallyHidden } from 'radix-ui';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';

import AddGroupForm from './AddGroupForm';

interface IProps {
  data: {
    id?: string;
    title?: string;
    open: boolean;
  };
  onFinish: () => void;
  onToggle: (open: boolean) => void;
}

export default function CreateGroup(props: IProps) {
  const { data, onFinish, onToggle } = props;
  const { t } = useTranslation();
  const title = data.id ? t('manage.edit_group') : t('manage.create_group');

  return (
    <Dialog open={data.open} onOpenChange={onToggle}>
      <DialogTrigger asChild>
        <Button variant="default">{t('manage.add')}</Button>
      </DialogTrigger>
      <DialogContent className="w-[90%] max-w-sm sm:max-w-sm p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <VisuallyHidden.Root>
            <DialogDescription></DialogDescription>
          </VisuallyHidden.Root>
        </DialogHeader>
        <AddGroupForm data={data} onFinish={onFinish} />
      </DialogContent>
    </Dialog>
  );
}
