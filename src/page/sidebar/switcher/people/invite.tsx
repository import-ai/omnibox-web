import { useState } from 'react';
import InviteForm from './invite-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Invite() {
  const { t } = useTranslation();
  const [open, onOpen] = useState(false);
  const onCancel = () => {
    onOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          {t('invite.add')}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-1/2 max-w-7xl">
        <DialogHeader>
          <DialogTitle>{t('invite.add')}</DialogTitle>
        </DialogHeader>
        <InviteForm onFinish={onCancel} />
      </DialogContent>
    </Dialog>
  );
}
