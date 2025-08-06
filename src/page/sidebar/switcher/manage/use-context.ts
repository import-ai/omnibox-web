import axios from 'axios';
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
  const refetch = async () => {
    const source = axios.CancelToken.source();
    const [group, member, invitation] = await Promise.all(
      [
        `namespaces/${namespace_id}/groups`,
        `namespaces/${namespace_id}/members`,
        `namespaces/${namespace_id}/invitations?type=group`,
      ].map(url => http.get(url, { cancelToken: source.token }))
    );
    onData({
      group,
      member,
      invitation,
    });
    return () => {
      source.cancel();
    };
  };

  useEffect(() => {
    refetch();
  }, []);

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
