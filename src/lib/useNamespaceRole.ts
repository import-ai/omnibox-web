import { useEffect, useState } from 'react';

import { Role } from '@/interface.ts';
import { http } from '@/lib/request';

export interface MeNamespaceResponseDto {
  user_id: string;
  namespace_id: string;
  email: string | null;
  username: string;
  role: Role;
}

export function useNamespaceRole(namespaceId?: string, enabled = true) {
  const [role, setRole] = useState<Role>('member');
  const [settledFor, setSettledFor] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setSettledFor(null);
    if (namespaceId && !enabled) {
      // The caller already knows the owner flag from the namespace record.
      setSettledFor(namespaceId);
    } else if (namespaceId) {
      http
        .get(`namespaces/${namespaceId}/me`)
        .then((response: MeNamespaceResponseDto) => {
          if (active) setRole(response.role);
        })
        .catch(() => {
          if (active) setRole('member');
        })
        .finally(() => {
          if (active) setSettledFor(namespaceId);
        });
    }
    return () => {
      active = false;
    };
  }, [enabled, namespaceId]);
  return {
    role,
    loading: !!namespaceId && settledFor !== namespaceId,
  };
}
