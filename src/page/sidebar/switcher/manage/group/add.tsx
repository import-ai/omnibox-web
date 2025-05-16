import AddGroupForm from './add-form';
import { Button } from '@/components/ui/button';
// import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  // const { t } = useTranslation();
  const title = data.id ? '编辑群组' : '创建群组';

  return (
    <Dialog open={data.open} onOpenChange={onToggle}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          {title}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-1/2 max-w-7xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <AddGroupForm data={data} onFinish={onFinish} />
      </DialogContent>
    </Dialog>
  );
}
