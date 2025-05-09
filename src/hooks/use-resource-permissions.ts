import { toast } from 'sonner';
import { http } from '@/lib/request';
import { Permissions } from '@/interface';
import { useState, useEffect } from 'react';

export interface IResourcePermissions {
  resource_id: string;
  // namespace_id: string;
}

export default function useResourcePermissions(props: IResourcePermissions) {
  const { resource_id } = props;
  const [permission, onPermission] = useState<Permissions>({
    read: false,
    write: false,
    comment: false,
    share: false,
    noAccess: false,
  });

  useEffect(() => {
    if (!resource_id) {
      return;
    }
    http
      .get(`/resources/${resource_id}/permissions`)
      .then(onPermission)
      .catch((err) => {
        toast(err && err.message ? err.message : err, {
          position: 'top-center',
        });
      });
  }, [resource_id]);

  return permission;
}
