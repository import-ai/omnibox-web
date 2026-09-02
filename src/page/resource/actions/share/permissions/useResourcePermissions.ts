import { useCallback, useEffect, useRef, useState } from 'react';

import useApp from '@/hooks/useApp';
import { GroupPermission, Permission, Role, UserPermission } from '@/interface';
import { http } from '@/lib/request';

export interface ResourcePermissionsData {
  global_permission: Permission;
  users: Array<UserPermission>;
  groups: Array<GroupPermission>;
  current_permission: Permission;
  current_role: Role;
}

export const emptyResourcePermissions: ResourcePermissionsData = {
  users: [],
  groups: [],
  global_permission: 'full_access',
  current_permission: 'full_access',
  current_role: 'member',
};

export default function useResourcePermissions(
  namespaceId: string,
  resourceId: string,
  enabled = true
) {
  const app = useApp();
  const [data, setData] = useState<ResourcePermissionsData>(
    emptyResourcePermissions
  );
  const [loading, setLoading] = useState(enabled);
  const [ready, setReady] = useState(!enabled);
  const [error, setError] = useState(false);
  const latestRequest = useRef(0);

  const refetch = useCallback(async () => {
    const request = ++latestRequest.current;
    if (!enabled || !namespaceId || !resourceId) {
      if (request === latestRequest.current) {
        setLoading(false);
        setReady(false);
        setError(false);
      }
      return;
    }
    setLoading(true);
    setReady(false);
    setError(false);
    try {
      const response = await http.get<ResourcePermissionsData>(
        `namespaces/${namespaceId}/resources/${resourceId}/permissions`
      );
      if (request === latestRequest.current) {
        setData(response);
        setReady(true);
        setError(false);
      }
    } catch (cause) {
      if (request === latestRequest.current) {
        setError(true);
      }
      throw cause;
    } finally {
      if (request === latestRequest.current) {
        setLoading(false);
      }
    }
  }, [enabled, namespaceId, resourceId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void refetch().catch(() => undefined);
    return app.on('user_permission_refetch', () => {
      void refetch().catch(() => undefined);
    });
  }, [app, enabled, refetch]);

  return { data, loading, ready, error, refetch };
}
