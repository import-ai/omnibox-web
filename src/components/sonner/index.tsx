import type { ReactNode } from 'react';
import { toast } from 'sonner';

const actionButtonClassName =
  'bg-black hover:!bg-neutral-800 dark:!bg-white dark:!text-black active:!bg-neutral-700 dark:active:!bg-neutral-300 dark:hover:!bg-neutral-100 h-[30px] px-3 rounded-md';

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
