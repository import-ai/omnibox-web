import { getData } from './data';
import { http } from '@/lib/request';
import { Permission } from '@/interface';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Action, { ActionProps } from './action';

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
  const updatePermission = (level: Permission) => {
    return http
      .patch(
        `namespaces/${namespace_id}/resources/${resource_id}/permissions/groups/${group_id}`,
        { level },
      )
      .then(refetch);
  };
  const removePermission = () => {
    return http
      .delete(
        `namespaces/${namespace_id}/resources/${resource_id}/permissions/groups/${group_id}`,
      )
      .then(refetch);
  };
  const handleChange = (level: Permission) => {
    updatePermission(level);
  };
  const handleRemove = () => {
    removePermission();
  };

  return (
    <Action
      data={data}
      value={value}
      disabled={disabled}
      className={className}
      onChange={handleChange}
      afterAddon={
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleRemove}
            className="text-red-500 cursor-pointer justify-between hover:bg-gray-100 dark:hover:bg-gray-400"
          >
            {t('permission.remove')}
          </DropdownMenuItem>
        </>
      }
    />
  );
}
