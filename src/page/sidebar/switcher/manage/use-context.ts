import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Permission } from '@/interface';

export default function useContext() {
  const params = useParams();
  const namespace_id = params.namespace_id || '';
  const [search, onSearch] = useState('');
  const [loading, onLoading] = useState(true);
  const [data, onData] = useState<Array<User>>([]);
  const [permission, onPermission] = useState<Permission>('full_access');
  const refetch = () => {
    http
      .get(`namespaces/${namespace_id}/members`)
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
  };

  useEffect(refetch, []);

  return {
    loading,
    search,
    onSearch,
    permission,
    onPermission,
    data: search ? data.filter((item) => item.email.includes(search)) : data,
  };
}
