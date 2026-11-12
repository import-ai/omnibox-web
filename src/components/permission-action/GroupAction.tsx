import { useTranslation } from 'react-i18next';

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { Permission } from '@/interface';
import { http } from '@/lib/request';
import { trackButtonClick } from '@/lib/trackButtonClick';

import Action, { ActionProps } from './Action';
import { getData } from './data';

interface IProps extends Omit<ActionProps, 'afterAddon' | 'data' | 'onChange'> {
  group_id?: string;
  resource_id: string;
  namespace_id: string;
  refetch: () => void;
}

export default function GroupAction(props: IProps) {
  const {
    group_id,
    value,
    disabled,
    namespace_id,
    resource_id,
    className,
    refetch,
  } = props;
  const data = getData(true);
  const { t } = useTranslation();
  const updatePermission = (permission: Permission) => {
    trackButtonClick('resource_permission_select', { permission });
    return http
      .patch(
        `namespaces/${namespace_id}/resources/${resource_id}/permissions/groups/${group_id}`,
        { permission }
      )
      .then(refetch);
  };
  const removePermission = () => {
    return http
      .delete(
        `namespaces/${namespace_id}/resources/${resource_id}/permissions/groups/${group_id}`
      )
      .then(refetch);
  };
  const handleChange = (permission: Permission) => {
    updatePermission(permission);
  };
  const handleRemove = () => {
    trackButtonClick('resource_permission_remove');
    removePermission();
  };

  return (
    <Action
      data={data}
      value={value}
      disabled={disabled}
      className={className}
      outsideCloseTrackName="resource_overlay_close"
      outsideCloseTarget="permission"
      onChange={handleChange}
      afterAddon={
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={handleRemove}
            className="cursor-pointer justify-between"
          >
            {t('permission.remove')}
          </DropdownMenuItem>
        </>
      }
    />
  );
}
