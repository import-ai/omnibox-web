import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import { http } from '@/lib/request';

import useApp from './useApp';

interface IProps {
  namespaceId: string;
}

interface NamespaceMemberState {
  namespaceId: string;
  data: { count: number };
  loading: boolean;
}

export default function useNamespaceMember(props: IProps) {
  const app = useApp();
  const { namespaceId } = props;
  const requestRef = useRef<{ id: number; cancel: () => void } | undefined>(
    undefined
  );
  const requestIdRef = useRef(0);
  const [state, setState] = useState<NamespaceMemberState>({
    namespaceId,
    data: { count: 0 },
    loading: true,
  });

  const refetch = useCallback(() => {
    requestRef.current?.cancel();
    const requestId = ++requestIdRef.current;
    const source = axios.CancelToken.source();
    requestRef.current = { id: requestId, cancel: () => source.cancel() };
    setState(prevState => ({
      namespaceId,
      data:
        prevState.namespaceId === namespaceId ? prevState.data : { count: 0 },
      loading: true,
    }));

    http
      .get<{ count: number }>(`namespaces/${namespaceId}/members/count`, {
        cancelToken: source.token,
      })
      .then(data => {
        if (requestRef.current?.id === requestId) {
          setState({ namespaceId, data, loading: false });
        }
      })
      .catch(() => {
        if (requestRef.current?.id === requestId) {
          setState(prevState => ({
            namespaceId,
            data:
              prevState.namespaceId === namespaceId
                ? prevState.data
                : { count: 0 },
            loading: false,
          }));
        }
      })
      .finally(() => {
        if (requestRef.current?.id === requestId) {
          requestRef.current = undefined;
        }
      });
  }, [namespaceId]);

  useEffect(() => {
    refetch();
    return () => {
      requestRef.current?.cancel();
      requestRef.current = undefined;
    };
  }, [refetch]);

  useEffect(() => {
    return app.on('namespaces_refetch', refetch);
  }, [app, refetch]);

  const isCurrentNamespace = state.namespaceId === namespaceId;

  return {
    data: isCurrentNamespace ? state.data : { count: 0 },
    refetch,
    loading: !isCurrentNamespace || state.loading,
  };
}
