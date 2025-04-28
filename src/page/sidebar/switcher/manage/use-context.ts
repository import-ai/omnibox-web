import { toast } from 'sonner';
import { User } from '@/interface';
import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import { getNamespace } from '@/lib/namespace';

export default function useContext() {
  const [search, onSearch] = useState('');
  const [loading, onLoading] = useState(true);
  const [data, onData] = useState<Array<User>>([]);
  const refetch = () => {
    const namespace = getNamespace();
    const collaborators = Array.isArray(namespace.collaborators)
      ? namespace.collaborators
      : [];
    http
      .get(`user/users-by-ids?id=${collaborators.join(',')}`)
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
  };
  const onDisable = (id: string) => {
    const namespace = getNamespace();
    http
      .post('namespaces/disable-user', { id, namespace: namespace.id })
      .then(() => {
        toast('Disable user successfully', { position: 'top-center' });
        // namespace.collaborators = namespace.collaborators.filter(
        //   (item: string) => item !== id
        // );
        // localStorage.setItem('namespace', JSON.stringify(namespace));
        refetch();
      });
  };
  const onRemove = (id: string) => {
    const namespace = getNamespace();
    http
      .post('namespaces/remove-user', { id, namespace: namespace.id })
      .then(() => {
        namespace.collaborators = namespace.collaborators.filter(
          (item: string) => item !== id,
        );
        localStorage.setItem('namespace', JSON.stringify(namespace));
        refetch();
      });
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
