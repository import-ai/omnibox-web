import { useState } from 'react';
import { http } from '@/lib/request';
import { Permission } from '@/interface';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Action, { ActionProps } from './action';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface IProps extends Omit<ActionProps, 'afterAddon'> {
  user_id: string;
  resource_id: string;
  namespace_id: string;
  refetch: () => void;
  alertWhenDelete?: boolean;
}

export default function PermissionAction(props: IProps) {
  const {
    user_id,
    value,
    namespace_id,
    resource_id,
    className,
    refetch,
    alertWhenDelete,
  } = props;
  const [grant, onGrant] = useState(false);
  const [remove, onRemove] = useState(false);
  const updatePermission = (level: Permission) => {
    return http
      .patch(
        `namespaces/${namespace_id}/resources/${resource_id}/permissions/users/${user_id}`,
        { level },
      )
      .then(refetch);
  };
  const removePermission = () => {
    return http
      .delete(
        `namespaces/${namespace_id}/resources/${resource_id}/permissions/users/${user_id}`,
      )
      .then(refetch);
  };
  const handleRemove = () => {
    onRemove(true);
  };
  const handleRemoveCancel = () => {
    onRemove(false);
  };
  const handleGrant = () => {
    onGrant(true);
  };
  const handleGrantOk = () => {
    removePermission().then(() => {
      onGrant(false);
    });
  };
  const handleRemoveOk = () => {
    if (alertWhenDelete) {
      handleGrant();
      return;
    }
    removePermission().then(() => {
      handleRemoveCancel();
    });
  };

  return (
    <>
      <Action
        value={value}
        className={className}
        onChange={updatePermission}
        afterAddon={
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRemove}
              className="text-red-500 cursor-pointer justify-between hover:bg-gray-100"
            >
              移除
            </DropdownMenuItem>
          </>
        }
      />
      <AlertDialog open={remove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除自己的访问权限吗？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRemoveCancel}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveOk}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={grant}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              在移除此权限之前，请向其他人授予“全部权限”。
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="w-full" onClick={handleGrantOk}>
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
