import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import UserCard from '@/components/user-card';
import Action from '@/components/permission-action';
import { Permission, UserPermission, GroupPermission } from '@/interface';

interface UserFormProps {
  resource_id: string;
  namespace_id: string;
}

export default function UserForm(props: UserFormProps) {
  const { resource_id, namespace_id } = props;
  const uid = localStorage.getItem('uid');
  const [data, onData] = useState<{
    global_level: Permission;
    users: Array<UserPermission>;
    groups: Array<GroupPermission>;
  }>({
    users: [],
    groups: [],
    global_level: 'full_access',
  });
  const refetch = () => {
    if (!namespace_id || !resource_id) {
      return;
    }
    http
      .get(`namespaces/${namespace_id}/resources/${resource_id}/permissions`)
      .then(onData);
  };

  useEffect(refetch, [namespace_id, resource_id]);

  return (
    <div className="space-y-2 text-sm">
      {data.users.map((item: UserPermission) => (
        <div
          key={item.user ? item.user.id : item.level}
          className="flex items-center p-2 -m-2 rounded-sm transition-all justify-between cursor-pointer hover:bg-gray-100"
        >
          {item.user ? (
            <>
              <UserCard
                email={item.user.email}
                username={item.user.username}
                you={item.user.id === uid}
              />
              <Action
                value={item.level}
                refetch={refetch}
                user_id={item.user.id}
                resource_id={resource_id}
                namespace_id={namespace_id}
                users={data.users}
              />
            </>
          ) : (
            '--'
          )}
        </div>
      ))}
    </div>
  );
}
