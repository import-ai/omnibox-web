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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          添加成员
        </Button>
      </DialogTrigger>
      <DialogContent className="w-1/2 max-w-7xl">
        <DialogHeader>
          <DialogTitle>邀请成员</DialogTitle>
        </DialogHeader>
        <InviteForm />
      </DialogContent>
    </Dialog>
  );
}
