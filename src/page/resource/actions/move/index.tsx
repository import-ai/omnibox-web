import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import Form, { IFormProps } from './form';

interface IProps extends IFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MoveTo(props: IProps) {
  const {
    open,
    resourceId,
    namespaceId,
    onOpenChange,
    onFinished,
    sourceResourceType,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[480px] max-w-[90%] px-4 pt-6 pb-5 overflow-hidden">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle></DialogTitle>
            <DialogDescription></DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <Form
          resourceId={resourceId}
          namespaceId={namespaceId}
          sourceResourceType={sourceResourceType}
          onFinished={onFinished}
        />
      </DialogContent>
    </Dialog>
  );
}
