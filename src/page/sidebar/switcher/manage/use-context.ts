import { toast } from 'sonner';
import { User } from '@/interface';
import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function useContext() {
  const params = useParams();
  const namespace_id = params.namespace_id || '';
  const [search, onSearch] = useState('');
  const [loading, onLoading] = useState(true);
  const [data, onData] = useState<Array<User>>([]);
  const refetch = () => {
    http.get(`namespaces/${namespace_id}`).then((namespace) => {
      const collaborators = Array.isArray(namespace.collaborators)
        ? namespace.collaborators
        : [];
      http
        .get(`user/users-by-ids?id=${collaborators.join(',')}`)
        .then(onData)
        .finally(() => {
          onLoading(false);
        });
    });
  };
  const onDisable = (id: string) => {
    http
      .post('namespaces/disable-user', { id, namespace: namespace_id })
      .then(() => {
        toast('Disable user successfully', { position: 'top-center' });
        refetch();
      });
  };
  const onRemove = (id: string) => {
    http
      .post('namespaces/remove-user', { id, namespace: namespace_id })
      .then(refetch);
  };

  useEffect(refetch, []);

  return {
    loading,
    search,
    onSearch,
    onDisable,
    onRemove,
    data: search ? data.filter((item) => item.username.includes(search)) : data,
  };
}
