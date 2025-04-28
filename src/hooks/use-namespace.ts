import useApp from './use-app';
import { http } from '@/lib/request';
import { Namespace } from '@/interface';
import { useState, useEffect } from 'react';
import { getNamespace } from '@/lib/namespace';

export default function useNamespace() {
  const app = useApp();
  const namespace = getNamespace({ id: '', name: '' });
  const namespaceId = namespace.id;
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Namespace>({
    id: '',
    name: '',
  });
  const refetch = () => {
    if (!namespaceId) {
      return;
    }
    onLoading(true);
    http
      .get(`namespaces/${namespaceId}`)
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
  };
  const onChange = (val: { name: string }) => {
    if (!namespaceId) {
      return Promise.reject('No namespace id');
    }
    onLoading(true);
    return http
      .patch(`namespaces/${namespaceId}`, val)
      .then(() => {
        onData({ ...data, ...val });
        return Promise.resolve();
      })
      .finally(() => {
        onLoading(false);
      });
  };

  useEffect(refetch, [namespaceId]);

  useEffect(() => {
    if (!data.id) {
      return;
    }
    localStorage.setItem('namespace', JSON.stringify(data));
  }, [data]);

  return { app, data, onChange, loading };
}
