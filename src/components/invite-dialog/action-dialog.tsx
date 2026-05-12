import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ActionDialogProps {
  title: string;
  children?: ReactNode | ((close: () => void) => ReactNode);
  trigger?: ReactNode;
  contentClassName?: string;
  contentProps?: Omit<
    React.ComponentPropsWithoutRef<typeof DialogContent>,
    'className' | 'children'
  >;
  titleClassName?: string;
  closeClassName?: string;
  closeWrapperClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ActionDialog(props: ActionDialogProps) {
  const {
    title,
    children,
    trigger,
    contentClassName = 'w-[90%] max-w-sm',
    contentProps,
    titleClassName,
    closeClassName,
    closeWrapperClassName,
    open: controlledOpen,
    onOpenChange,
  } = props;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const handleOpenChange = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={cn(contentClassName, '[&>button]:hidden')}
        onEscapeKeyDown={() => handleOpenChange(false)}
        {...contentProps}
      >
        <div className="contents">
          <div className={cn('absolute right-4 top-4', closeWrapperClassName)}>
            <DialogClose
              className={cn(
                'rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:pointer-events-none data-[state=open]:bg-transparent data-[state=open]:text-muted-foreground',
                closeClassName
              )}
            >
              <X
                className={cn(
                  'h-6 w-6',
                  closeClassName?.includes('size-') ? '' : closeClassName
                )}
              />
            </DialogClose>
          </div>
          <DialogHeader>
            <DialogTitle className={titleClassName}>{title}</DialogTitle>
            <VisuallyHidden>
              <DialogDescription></DialogDescription>
            </VisuallyHidden>
          </DialogHeader>
          {typeof children === 'function'
            ? children(() => handleOpenChange(false))
            : children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
