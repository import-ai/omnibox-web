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

export function useNamespaceRole(namespaceId?: string) {
  const [role, setRole] = useState<Role>('member');
  useEffect(() => {
    if (namespaceId) {
      http
        .get(`namespaces/${namespaceId}/me`)
        .then((response: MeNamespaceResponseDto) => setRole(response.role));
    }
  }, [namespaceId]);
  return {
    role,
  };
}
