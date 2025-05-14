import { toast } from 'sonner';
import { http } from '@/lib/request';
import useUser from '@/hooks/use-user';
import { Permission } from '@/interface';
import Loading from '@/components/loading';
import { useState, useEffect } from 'react';
import Action from '@/components/permission';
import UserCard from '@/components/user-card';
// import { useTranslation } from 'react-i18next';

interface UserFormProps {
  resource_id: string;
  namespace_id: string;
}

export default function UserForm(props: UserFormProps) {
  const { resource_id, namespace_id } = props;
  // const { t } = useTranslation();
  const { uid, user } = useUser();
  const [loading, onLoading] = useState(false);
  const [permission, onPermission] = useState<Permission>('full_access');
  const handlePermission = (value: Permission) => {
    http
      .put(
        `namespaces/${namespace_id}/resources/${resource_id}/permissions/users/${user.id}`,
        {
          permission: value,
        },
      )
      .then(() => {
        onPermission(value);
        toast('更新成功', {
          position: 'top-center',
        });
      });
  };

  useEffect(() => {
    if (!namespace_id || !resource_id || !user.id) {
      return;
    }
    onLoading(true);
    http
      .get(
        `namespaces/${namespace_id}/resources/${resource_id}/permissions/users/${user.id}`,
      )
      .then((res) => {
        onPermission(res.level);
      })
      .finally(() => {
        onLoading(false);
      });
  }, [namespace_id, resource_id, user.id]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center p-2 -m-2 rounded-sm transition-all justify-between cursor-pointer hover:bg-gray-100">
        <UserCard {...user} you={user.id == uid} />
        {user.id && <Action value={permission} onChange={handlePermission} />}
      </div>
    </div>
  );
}
