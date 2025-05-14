import useApp from './use-app';
import { http } from '@/lib/request';
import { Namespace } from '@/interface';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function useNamespace() {
  const app = useApp();
  const params = useParams();
  const namespace_id = params.namespace_id;
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Namespace>({
    id: '',
    name: '',
  });
  const refetch = () => {
    if (!namespace_id) {
      return;
    }
    onLoading(true);
    http
      .get(`namespaces/${namespace_id}`)
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
  };
  const onChange = (val: { name: string }) => {
    if (!namespace_id) {
      return Promise.reject('No namespace id');
    }
    onLoading(true);
    return http
      .patch(`namespaces/${namespace_id}`, val)
      .then(() => {
        onData({ ...data, ...val });
        return Promise.resolve();
      })
      .finally(() => {
        onLoading(false);
      });
  };

  useEffect(refetch, [namespace_id]);

  return { app, data, onChange, loading };
}
