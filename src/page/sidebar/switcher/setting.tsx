import { Settings } from 'lucide-react';
import SettingWrapper from './swtting-wrapper';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Setting() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-muted-foreground h-7 gap-1 px-2"
        >
          <Settings />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="w-4/5 max-w-7xl">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>
        <SettingWrapper />
      </DialogContent>
    </Dialog>
  );
}
