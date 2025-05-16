import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Group, Member } from '@/interface';

export default function useContext() {
  const params = useParams();
  const namespace_id = params.namespace_id || '';
  const [search, onSearch] = useState('');
  const [tab, onTab] = useState('member');
  const [data, onData] = useState<{
    member: Array<Member>;
    group: Array<Group>;
  }>({
    group: [],
    member: [],
  });
  const refetch = () => {
    Promise.all(
      [
        `namespaces/${namespace_id}/groups`,
        `namespaces/${namespace_id}/members`,
      ].map((url) => http.get(url)),
    ).then(([group, member]) => {
      onData({
        group,
        member,
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
