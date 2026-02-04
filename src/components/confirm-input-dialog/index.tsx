import { useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

interface ConfirmInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  warningTitle?: string;
  warningBody?: string;
  confirmText: string;
  confirmLabel?: string;
  confirmButtonText: string;
  cancelButtonText?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  trigger?: React.ReactNode;
}

export function ConfirmInputDialog({
  open,
  onOpenChange,
  title,
  warningTitle,
  warningBody,
  confirmText,
  confirmLabel,
  confirmButtonText,
  cancelButtonText = 'Cancel',
  loading = false,
  onConfirm,
  trigger,
}: ConfirmInputDialogProps) {
  const [inputValue, setInputValue] = useState('');

  // Reset input when dialog closes
  useEffect(() => {
    if (!open) {
      setInputValue('');
    }
  }, [open]);

  const isConfirmDisabled = loading || inputValue !== confirmText;

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isConfirmDisabled) {
      onConfirm();
    }
  };

  const content = (
    <AlertDialogContent className="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription className="space-y-4">
          {warningTitle && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="font-semibold text-destructive">{warningTitle}</p>
              {warningBody && (
                <p className="text-sm mt-2 text-foreground">{warningBody}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="confirm-input">
              {confirmLabel || `Type "${confirmText}" to confirm`}
            </Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={confirmText}
              disabled={loading}
              autoComplete="off"
              className="border-line"
            />
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={loading} className="border-line">
          {cancelButtonText}
        </AlertDialogCancel>
        <AlertDialogAction
          disabled={isConfirmDisabled}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={handleConfirm}
        >
          {loading && <Spinner className="mr-2" />}
          {confirmButtonText}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  if (trigger) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
        {content}
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {content}
    </AlertDialog>
  );
}
