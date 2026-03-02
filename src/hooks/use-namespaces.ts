import axios from 'axios';
import { useEffect, useState } from 'react';

import { Namespace } from '@/interface';
import { http } from '@/lib/request';

import useApp from './use-app';

interface IProps {
  disabled?: boolean;
}

export default function useNamespaces(props?: IProps) {
  const { disabled = false } = props || {};
  const app = useApp();
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<Namespace>>([]);

  const refetch = () => {
    if (disabled) {
      return;
    }
    if (!localStorage.getItem('uid')) {
      return;
    }
    onLoading(true);
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

  useEffect(refetch, [disabled]);

  useEffect(() => {
    return app.on('namespaces_refetch', refetch);
  }, []);

  return { app, data, loading };
}
