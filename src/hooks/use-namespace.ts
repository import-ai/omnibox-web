import useApp from './use-app';
import { http } from '@/utils/request';
import { Namespace } from '@/interface';
import { useState, useEffect } from 'react';

export default function useNamespace() {
  const app = useApp();
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<Namespace>>([]);

  useEffect(() => {
    onLoading(true);
    http
      .get('namespaces/user')
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
  }, []);

  return { app, data, loading };
}
