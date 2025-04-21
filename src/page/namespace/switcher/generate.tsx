import GenerateForm from '../form/namespace';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Generate() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
        >
          <Plus className="size-4" />
          添加空间
        </Button>
      </DialogTrigger>
      <DialogContent className="w-1/2 max-w-7xl">
        <DialogHeader>
          <DialogTitle>添加空间</DialogTitle>
        </DialogHeader>
        <GenerateForm />
      </DialogContent>
    </Dialog>
  );
}
