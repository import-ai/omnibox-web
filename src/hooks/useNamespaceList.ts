import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Namespace } from '@/interface';
import { http } from '@/lib/request';

import useApp from './useApp';

export default function useNamespaceList(endpoint: string, disabled: boolean) {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Array<Namespace>>([]);
  const activeRef = useRef(false);
  const requestRef = useRef<{
    id: number;
    cancel: () => void;
  }>();
  const requestIdRef = useRef(0);
  const refreshPendingRef = useRef(false);

  const refetch = useCallback(() => {
    if (disabled || !localStorage.getItem('uid')) return;

    if (requestRef.current) {
      refreshPendingRef.current = true;
      return;
    }

    const id = ++requestIdRef.current;
    setLoading(true);
    const source = axios.CancelToken.source();
    requestRef.current = { id, cancel: () => source.cancel() };
    http
      .get(endpoint, { cancelToken: source.token })
      .then(result => {
        if (activeRef.current && requestRef.current?.id === id) {
          setData(result);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (requestRef.current?.id !== id) return;
        requestRef.current = undefined;
        if (activeRef.current) {
          setLoading(false);
          if (refreshPendingRef.current) {
            refreshPendingRef.current = false;
            refetch();
          }
        }
      });
  }, [disabled, endpoint]);

  useEffect(() => {
    if (disabled) {
      activeRef.current = false;
      requestRef.current?.cancel();
      requestRef.current = undefined;
      refreshPendingRef.current = false;
      setLoading(false);
      return;
    }

    activeRef.current = true;
    refetch();
    const unsubscribe = app.on('namespaces_refetch', refetch);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const interval = window.setInterval(refreshWhenVisible, 10_000);

    return () => {
      activeRef.current = false;
      requestRef.current?.cancel();
      requestRef.current = undefined;
      refreshPendingRef.current = false;
      unsubscribe();
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, [app, disabled, refetch]);

  return { app, data, loading };
}
