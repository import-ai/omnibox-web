import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { NamespaceMember } from '@/interface';

export default function useContext() {
  const params = useParams();
  const namespace_id = params.namespace_id || '';
  const [search, onSearch] = useState('');
  const [tab, onTab] = useState('member');
  const [data] = useState<{
    member: Array<NamespaceMember>;
    group: Array<NamespaceMember>;
  }>({
    group: [],
    member: [],
  });
  // const [permission, onPermission] = useState<Permission>('full_access');
  const refetch = () => {
    Promise.all(
      [
        `namespaces/${namespace_id}/groups`,
        `namespaces/${namespace_id}/members`,
      ].map((url) => http.get(url)),
    ).then((res) => {
      console.log('res', res);
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
    // permission,
    // onPermission,
    // : search ? data.filter((item) => item.email.includes(search)) : data,
  };
}
