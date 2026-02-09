import { useEffect, useState } from 'react';

import useApp from '@/hooks/use-app';
import { GroupPermission, Permission, Role, UserPermission } from '@/interface';
import { http } from '@/lib/request';

import Group from './group';
import User from './user';

interface UserFormProps {
  resource_id: string;
  namespace_id: string;
}

export default function Wrapper(props: UserFormProps) {
  const { resource_id, namespace_id } = props;
  const app = useApp();
  const [data, onData] = useState<{
    global_permission: Permission;
    users: Array<UserPermission>;
    groups: Array<GroupPermission>;
    current_permission: Permission;
    current_role: Role;
  }>({
    users: [],
    groups: [],
    global_permission: 'full_access',
    current_permission: 'full_access',
    current_role: 'member',
  });
  const refetch = () => {
    if (!namespace_id || !resource_id) {
      return;
    }
    http
      .get(`namespaces/${namespace_id}/resources/${resource_id}/permissions`)
      .then(onData);
  };

  useEffect(() => {
    refetch();
    return app.on('user_permission_refetch', refetch);
  }, [namespace_id, resource_id]);

  return (
    <div className="space-y-2 text-sm max-h-[60vh] sm:max-h-[60vh] overflow-y-auto overflow-x-hidden pr-3">
      <User
        data={data.users}
        refetch={refetch}
        resource_id={resource_id}
        namespace_id={namespace_id}
        current_permission={data.current_permission}
        current_role={data.current_role}
      />
      <Group
        data={data.groups}
        refetch={refetch}
        resource_id={resource_id}
        namespace_id={namespace_id}
        current_permission={data.current_permission}
      />
    </div>
  );
}
