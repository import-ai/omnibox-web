import { Role } from '@/interface';
import { http } from '@/lib/request';
import { useState, useEffect } from 'react';

export interface UseGroupUser {
  namespace_id: string;
  group_id: string;
}

export default function useGroupUser(props: UseGroupUser) {
  const { group_id, namespace_id } = props;
  const [groupUserData, onData] = useState<
    Array<{
      role: Role;
      id: string;
      email: string;
      username: string;
    }>
  >([]);
  const groupUserRefetch = () => {
    http
      .get(`/namespaces/${namespace_id}/groups/${group_id}/users`)
      .then(onData);
  };
  const onRemove = (userId: string) => {
    http
      .delete(`/namespaces/${namespace_id}/groups/${group_id}/users/${userId}`)
      .then(groupUserRefetch);
  };

  useEffect(groupUserRefetch, []);

  return {
    onRemove,
    groupUserData,
    groupUserRefetch,
  };
}
