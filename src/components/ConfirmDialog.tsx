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
} from '@/components/ui/alert-dialog';
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
          'w-11/12 max-w-lg sm:max-w-lg bg-popover',
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
            variant={variant}
            className={cn('shadow-none', confirmClassName)}
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
