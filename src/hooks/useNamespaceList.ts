import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Namespace } from '@/interface';
import { http } from '@/lib/request';

import useApp from './useApp';

type RefreshMode = 'foreground' | 'background';

export default function useNamespaceList(endpoint: string, disabled: boolean) {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Array<Namespace>>([]);
  const activeRef = useRef(false);
  const requestRef = useRef<
    | {
        id: number;
        cancel: () => void;
      }
    | undefined
  >(undefined);
  const requestIdRef = useRef(0);
  const refreshPendingRef = useRef<RefreshMode | undefined>(undefined);

  const refetch = useCallback(
    (mode: RefreshMode = 'foreground') => {
      if (disabled || !localStorage.getItem('uid')) return;

      if (requestRef.current) {
        if (!refreshPendingRef.current || mode === 'foreground') {
          refreshPendingRef.current = mode;
        }
        return;
      }

      const id = ++requestIdRef.current;
      setLoading(true);
      const source = axios.CancelToken.source();
      requestRef.current = { id, cancel: () => source.cancel() };
      http
        .get(endpoint, {
          cancelToken: source.token,
          muteWhen:
            mode === 'background'
              ? error => (error.response?.status ?? error.status) !== 401
              : undefined,
        })
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
              const pendingMode = refreshPendingRef.current;
              refreshPendingRef.current = undefined;
              refetch(pendingMode);
            }
          }
        });
    },
    [disabled, endpoint]
  );

  useEffect(() => {
    if (disabled) {
      activeRef.current = false;
      requestRef.current?.cancel();
      requestRef.current = undefined;
      refreshPendingRef.current = undefined;
      setLoading(false);
      return;
    }

    activeRef.current = true;
    refetch();
    const unsubscribe = app.on('namespaces_refetch', () => refetch());
    const refreshInBackground = () => refetch('background');
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshInBackground();
    };
    window.addEventListener('focus', refreshInBackground);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const interval = window.setInterval(refreshWhenVisible, 10_000);

    return () => {
      activeRef.current = false;
      requestRef.current?.cancel();
      requestRef.current = undefined;
      refreshPendingRef.current = undefined;
      unsubscribe();
      window.removeEventListener('focus', refreshInBackground);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, [app, disabled, refetch]);

  return { app, data, loading };
}
