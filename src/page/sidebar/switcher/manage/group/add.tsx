import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import AddGroupForm from './add-form';

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
        <Button size="sm" className="h-[30px] w-[71px] text-sm font-semibold">
          {t('manage.add')}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90%] max-w-sm p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <VisuallyHidden>
            <DialogDescription></DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <AddGroupForm data={data} onFinish={onFinish} />
      </DialogContent>
    </Dialog>
  );
}
