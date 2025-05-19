import { getData } from './data';
import { useState } from 'react';
import { http } from '@/lib/request';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserPermission, Permission } from '@/interface';
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

interface IProps extends Omit<ActionProps, 'afterAddon' | 'data' | 'onChange'> {
  user_id: string;
  resource_id: string;
  namespace_id: string;
  refetch: () => void;
  users: Array<UserPermission>;
}

export default function PermissionAction(props: IProps) {
  const {
    user_id,
    value,
    namespace_id,
    resource_id,
    className,
    refetch,
    users,
  } = props;
  const data = getData();
  const { t } = useTranslation();
  const alertWhenDelete =
    users
      .filter((node) => node.user && node.user.id !== user_id)
      .findIndex((node) => node.level === 'full_access') < 0;
  const [grant, onGrant] = useState(false);
  const [remove, onRemove] = useState(false);
  const [granting] = useState(false);
  const [removeing, onRemoveing] = useState(false);
  const [permissioning, onPermissioning] = useState(false);
  const [permission, onPermission] = useState<Permission>('full_access');
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
  const handleChange = (level: Permission) => {
    const oldIndex = data.findIndex((item) => item.value === value);
    const newIndex = data.findIndex((item) => item.value === level);
    if (oldIndex < newIndex) {
      onPermission(level);
      return;
    }
    updatePermission(level);
  };
  const handleCancel = () => {
    onPermission('full_access');
  };
  const handleOk = () => {
    onPermissioning(true);
    updatePermission(permission)
      .then(handleCancel)
      .finally(() => {
        onPermissioning(false);
      });
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
    onGrant(false);
    // onGranting(true);
    // removePermission()
    //   .then(() => {
    //     onGrant(false);
    //   })
    //   .finally(() => {
    //     onGranting(false);
    //   });
  };
  const handleRemoveOk = () => {
    if (alertWhenDelete) {
      handleRemoveCancel();
      handleGrant();
      return;
    }
    onRemoveing(true);
    removePermission()
      .then(() => {
        handleRemoveCancel();
      })
      .finally(() => {
        onRemoveing(false);
      });
  };

  return (
    <>
      <Action
        data={data}
        value={value}
        className={className}
        onChange={handleChange}
        afterAddon={
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRemove}
              disabled={removeing}
              className="text-red-500 cursor-pointer justify-between hover:bg-gray-100"
            >
              {removeing && (
                <LoaderCircle className="transition-transform animate-spin" />
              )}
              {t('permission.remove')}
            </DropdownMenuItem>
          </>
        }
      />
      <AlertDialog open={permission !== 'full_access'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('permission.demote')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {t('permission.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction disabled={permissioning} onClick={handleOk}>
              {permissioning && (
                <LoaderCircle className="transition-transform animate-spin" />
              )}
              {t('permission.ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={remove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('permission.remove_self')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRemoveCancel}>
              {t('permission.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction disabled={removeing} onClick={handleRemoveOk}>
              {removeing && (
                <LoaderCircle className="transition-transform animate-spin" />
              )}
              {t('permission.ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={grant}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('permission.grant_permission')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="w-full"
              disabled={granting}
              onClick={handleGrantOk}
            >
              {granting && (
                <LoaderCircle className="transition-transform animate-spin" />
              )}
              {t('permission.ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
