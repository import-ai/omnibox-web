import { useEffect, useState } from 'react';

import Invite from '@/components/invite-dialog';
import { Role } from '@/interface';
import { http } from '@/lib/request';

interface InviteButtonProps {
  namespaceId: string;
}

export function InviteButton({ namespaceId }: InviteButtonProps) {
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const uid = localStorage.getItem('uid');

  useEffect(() => {
    if (namespaceId && uid) {
      http
        .get(`namespaces/${namespaceId}/members/${uid}`, { mute: true })
        .then(res => setCurrentUserRole(res?.role))
        .catch(() => setCurrentUserRole(null));
    }
  }, [namespaceId, uid]);

  const isOwnerOrAdmin =
    currentUserRole === 'owner' || currentUserRole === 'admin';

  if (!isOwnerOrAdmin) {
    return null;
  }

  return <Invite />;
}
