import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Group, Invitation, Member, Namespace } from '@/interface';
import { http } from '@/lib/request';

export default function useContext(canManageMembers: boolean) {
  const params = useParams();
  const namespace_id = params.namespace_id || '';
  const navigate = useNavigate();
  const [search, onSearch] = useState('');
  const [tab, onTab] = useState('member');
  const [loading, setLoading] = useState(true);
  const latestRequest = useRef(0);
  const [namespace, setNamespace] = useState<Namespace>({ id: '', name: '' });
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
    const request = ++latestRequest.current;
    const [member, namespaceData, group, invitation] = await Promise.all([
      http.get(`namespaces/${namespace_id}/members`, {
        mute: true,
      }),
      http.get(`namespaces/${namespace_id}`, {
        mute: true,
      }),
      canManageMembers
        ? http.get(`namespaces/${namespace_id}/groups`, {
            mute: true,
          })
        : Promise.resolve([]),
      canManageMembers
        ? http.get(`namespaces/${namespace_id}/invitations?type=group`, {
            mute: true,
          })
        : Promise.resolve([]),
    ]).catch(error => {
      if (error?.status === 403) {
        setTimeout(() => {
          // window.location.reload();
          navigate('/');
        }, 1000);
      }
      return [[], { id: '', name: '' }, [], []];
    });
    if (request !== latestRequest.current) {
      return;
    }
    onData({
      group,
      member,
      invitation,
    });
    setNamespace(namespaceData);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
  }, [canManageMembers, namespace_id]);

  useEffect(() => {
    if (!canManageMembers) {
      onTab('member');
    }
  }, [canManageMembers]);

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
    loading,
    namespace_id,
    namespaceName: namespace.name,
  };
}
