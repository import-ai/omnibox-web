import { toast } from 'sonner';
import { NamespaceMember } from '@/interface';
import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function useContext() {
  const params = useParams();
  const namespace_id = params.namespace_id || '';
  const [search, onSearch] = useState('');
  const [loading, onLoading] = useState(true);
  const [data, onData] = useState<Array<NamespaceMember>>([]);
  const refetch = () => {
    http
      .get(`namespaces/${namespace_id}/members`)
      .then(onData)
      .finally(() => {
        onLoading(false);
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
    data: search ? data.filter((item) => item.email.includes(search)) : data,
  };
}
