import { Markdown } from '@/components/markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';

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
      <DialogContent className="max-w-2xl sm:max-w-2xl border-border bg-popover">
        <DialogHeader>
          <DialogTitle className="text-left text-foreground">
            {detail?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          {detail ? (
            <Markdown content={detail.content} openLinksInNewWindow />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
