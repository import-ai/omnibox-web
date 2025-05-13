import Action from './action';
import { toast } from 'sonner';
import { http } from '@/lib/request';
import useUser from '@/hooks/use-user';
import { Permission } from '@/interface';
import Loading from '@/components/loading';
import { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
      })
      .catch((err) => {
        toast(err && err.message ? err.message : err, {
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
      .catch((err) => {
        toast(err && err.message ? err.message : err, {
          position: 'top-center',
        });
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
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-full">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="bg-gray-200">
              {user.username.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center">
              <span className="font-medium">{user.username}</span>
              {user.id === uid && (
                <span className="text-gray-500 ml-2">(你)</span>
              )}
            </div>
            <div className="text-gray-500 text-sm">{user.email}</div>
          </div>
        </div>
        {user.id && <Action value={permission} onChange={handlePermission} />}
      </div>
    </div>
  );
}
