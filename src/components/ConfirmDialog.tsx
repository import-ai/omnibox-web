import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  loading?: boolean;
  variant?: 'default' | 'destructive';
  contentClassName?: string;
  titleClassName?: string;
  confirmClassName?: string;
  cancelClassName?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  loading = false,
  variant = 'default',
  contentClassName,
  titleClassName,
  confirmClassName,
  cancelClassName,
  onOpenChange,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const confirmButtonClassName =
    variant === 'destructive'
      ? 'border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground'
      : undefined;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onCancel?.();
    }
    onOpenChange(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        className={cn(
          'w-11/12 max-w-lg bg-popover dark:bg-neutral-900',
          contentClassName
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={titleClassName}>
            {title}
          </AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            className={cn(
              'cancel-btn-outline bg-transparent shadow-none',
              cancelClassName
            )}
          >
            {cancelText ?? t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              'shadow-none',
              confirmButtonClassName,
              confirmClassName
            )}
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmText ?? t('ok')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
