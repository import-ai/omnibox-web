import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import InviteForm from './people/invite-form';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';

interface IProps {
  onFinish?: () => void;
  children?: React.ReactNode;
}

export default function Invite(props: IProps) {
  const { onFinish, children } = props;
  const { t } = useTranslation();
  const [open, onOpen] = useState(false);
  const onCancel = () => {
    onOpen(false);
    onFinish && onFinish();
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            size="sm"
            variant="outline"
            className="text-muted-foreground h-7 gap-1 px-2"
          >
            <UserPlus />
            {t('invite.add')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[90%] sm:w-1/2 max-w-7xl">
        <DialogHeader>
          <DialogTitle>{t('invite.add')}</DialogTitle>
          <VisuallyHidden>
            <DialogDescription></DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <InviteForm onFinish={onCancel} />
      </DialogContent>
    </Dialog>
  );
}
