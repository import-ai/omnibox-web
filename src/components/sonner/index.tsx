import type { ReactNode } from 'react';
import { toast } from 'sonner';

const actionButtonClassName =
  'bg-primary! text-primary-foreground! hover:bg-primary/80! h-8! px-2.5 rounded-lg! text-sm! font-medium!';

interface ShowActionToastOptions {
  actionLabel: ReactNode;
  onAction: () => void;
}

export function showActionToast(
  message: ReactNode,
  { actionLabel, onAction }: ShowActionToastOptions
) {
  toast(message, {
    action: {
      label: actionLabel,
      onClick: onAction,
    },
    classNames: {
      actionButton: actionButtonClassName,
    },
  });
}

export { actionButtonClassName };
