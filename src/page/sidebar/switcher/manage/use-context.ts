import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Group, Invitation, Member } from '@/interface';

export default function useContext() {
  const params = useParams();
  const namespace_id = params.namespace_id || '';
  const [search, onSearch] = useState('');
  const [tab, onTab] = useState('member');
  const [data, onData] = useState<{
    member: Array<Member>;
    group: Array<Group>;
    invitation: Array<Invitation>;
  }>({
    group: [],
    member: [],
    invitation: [],
  });
  const refetch = () => {
    Promise.all(
      [
        `namespaces/${namespace_id}/groups`,
        `namespaces/${namespace_id}/members`,
        `namespaces/${namespace_id}/invitations`,
      ].map((url) => http.get(url)),
    ).then(([group, member, invitation]) => {
      onData({
        group,
        member,
        invitation,
      });
    });
  };

  useEffect(refetch, []);

  useEffect(() => {
    onSearch('');
  }, [tab]);

  return {
    tab,
    onTab,
    data,
    search,
    refetch,
    onSearch,
    namespace_id,
  };
}
