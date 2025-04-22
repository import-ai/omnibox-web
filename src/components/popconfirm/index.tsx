import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';

interface IProps {
  title: string;
  message?: string;
  okText?: string;
  cancelText?: string;
  children: React.ReactNode;
  onCancel?: () => void;
  onOk?: () => void;
}

export default function MainAlertDialog(props: IProps) {
  const {
    title,
    message,
    children,
    onCancel,
    onOk,
    okText = '确定',
    cancelText = '取消',
  } = props;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {message && (
            <AlertDialogDescription>{message}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction className="bg-red-500" onClick={onOk}>
            {okText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
