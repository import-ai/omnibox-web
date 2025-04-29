import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import InviteForm from './people/invite-form';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
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
        <Button
          size="sm"
          variant="outline"
          className="text-muted-foreground h-7 gap-1 px-2"
        >
          <UserPlus />
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
