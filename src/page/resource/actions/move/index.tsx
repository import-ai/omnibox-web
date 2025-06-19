import Form from './form';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface IProps {
  open: boolean;
  namespaceId: string;
  onOpenChange: (open: boolean) => void;
}

export default function MoveTo(props: IProps) {
  const { open, namespaceId, onOpenChange } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[480px] max-w-[90%] px-4 pt-6 pb-5">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle></DialogTitle>
            <DialogDescription></DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <Form namespaceId={namespaceId} />
      </DialogContent>
    </Dialog>
  );
}
