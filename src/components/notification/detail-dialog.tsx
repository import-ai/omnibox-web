import { Markdown } from '@/components/markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { NotificationDetail } from './types';

interface NotificationDetailDialogProps {
  detail: NotificationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDetailDialog({
  detail,
  open,
  onOpenChange,
}: NotificationDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <DialogHeader>
          <DialogTitle className="text-left text-neutral-950 dark:text-neutral-50">
            {detail?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          {detail ? <Markdown content={detail.content} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
