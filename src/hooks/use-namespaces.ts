import useApp from './use-app';
import { http } from '@/lib/request';
import { Namespace } from '@/interface';
import { useState, useEffect } from 'react';

export default function useNamespaces() {
  const app = useApp();
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<Namespace>>([]);
  const refetch = () => {
    onLoading(true);
    http
      .get('namespaces/user')
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
  };

  useEffect(refetch, []);

  useEffect(() => {
    return app.on('namespace_refetch', refetch);
  }, []);

  return { app, data, loading };
}
