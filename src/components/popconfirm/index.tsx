import React from 'react';

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
import { trackButtonClick } from '@/lib/trackButtonClick';

interface IProps {
  title: string;
  message?: string;
  okText?: string;
  cancelText?: string;
  children: React.ReactNode;
  onCancel?: () => void;
  onOk?: () => void;
  cancelTrackName?: string;
  confirmTrackName?: string;
}

export default function MainAlertDialog(props: IProps) {
  const {
    title,
    message,
    children,
    onCancel,
    onOk,
    okText = 'Confirm',
    cancelText = 'Cancel',
    cancelTrackName,
    confirmTrackName,
  } = props;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="w-[85%] max-w-sm sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {message && (
            <AlertDialogDescription>{message}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              if (cancelTrackName) trackButtonClick(cancelTrackName);
              onCancel?.();
            }}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (confirmTrackName) trackButtonClick(confirmTrackName);
              onOk?.();
            }}
          >
            {okText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
