import axios from 'axios';
import { useEffect, useState } from 'react';

import { Namespace } from '@/interface';
import { http } from '@/lib/request';

import useApp from './use-app';

export default function useNamespaces() {
  const app = useApp();
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<Namespace>>([]);
  const refetch = () => {
    onLoading(true);
    if (!localStorage.getItem('uid')) {
      return;
    }
    const source = axios.CancelToken.source();
    http
      .get('namespaces', { cancelToken: source.token })
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
    return () => {
      source.cancel();
    };
  };

  useEffect(refetch, []);

  useEffect(() => {
    return app.on('namespaces_refetch', refetch);
  }, []);

  return { app, data, loading };
}
