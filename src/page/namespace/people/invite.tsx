import { useState } from 'react';
import InviteForm from './invite-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Invite() {
  const [open, onOpen] = useState(false);
  const onCancel = () => {
    onOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="w-1/2 max-w-7xl">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>
        <InviteForm onFinish={onCancel} />
      </DialogContent>
    </Dialog>
  );
}
