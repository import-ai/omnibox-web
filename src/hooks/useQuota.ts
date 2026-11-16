import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import { http } from '@/lib/request';

export interface UsageData {
  storage_bytes: {
    upload: number;
    file: number;
    other_users: number;
    total: number;
    subscription_total: number;
    onetime_total: number;
  };
  video_audio_parse: {
    video: number;
    audio: number;
    other_users: number;
    total: number;
    subscription_total: number;
    onetime_total: number;
  };
  doc_parse: {
    pdf: number;
    image: number;
    other_users: number;
    total: number;
    subscription_total: number;
    onetime_total: number;
  };
  agent_credits: {
    self: number;
    other_users: number;
    total: number;
    subscription_total: number;
    onetime_total: number;
  };
  basic: {
    expired: boolean;
    expire_date: string | null;
  };
  premium?: {
    expired: boolean;
    expire_date: string | null;
  };
  show_members_usage: boolean;
}

interface QuotaState {
  namespaceId: string;
  data: UsageData | null;
  loading: boolean;
}

interface ActiveRequest {
  namespaceId: string;
  source: axios.CancelTokenSource;
  promise: Promise<void>;
}

export default function useQuota(namespaceId: string) {
  const [state, setState] = useState<QuotaState>(() => ({
    namespaceId,
    data: null,
    loading: true,
  }));
  const activeRequest = useRef<ActiveRequest | null>(null);
  const namespaceRef = useRef(namespaceId);
  const mountedRef = useRef(true);
  namespaceRef.current = namespaceId;

  const fetchQuota = useCallback(
    (background = false, force = false) => {
      const targetNamespace = namespaceId;
      const inFlight = activeRequest.current;
      if (!force && inFlight?.namespaceId === targetNamespace) {
        return inFlight.promise;
      }

      inFlight?.source.cancel();
      const source = axios.CancelToken.source();
      if (!background) {
        setState(current =>
          current.namespaceId === targetNamespace
            ? { ...current, loading: current.data === null }
            : { namespaceId: targetNamespace, data: null, loading: true }
        );
      }

      const promise = http
        .get(`/namespaces/${targetNamespace}/usages`, {
          cancelToken: source.token,
        })
        .then((data: UsageData) => {
          if (
            mountedRef.current &&
            namespaceRef.current === targetNamespace &&
            activeRequest.current?.source === source
          ) {
            setState({ namespaceId: targetNamespace, data, loading: false });
          }
        })
        .catch(error => {
          if (
            !axios.isCancel(error) &&
            mountedRef.current &&
            namespaceRef.current === targetNamespace &&
            activeRequest.current?.source === source
          ) {
            setState(current =>
              current.namespaceId === targetNamespace
                ? { ...current, loading: false }
                : current
            );
          }
        })
        .finally(() => {
          if (activeRequest.current?.source === source) {
            activeRequest.current = null;
          }
        });

      activeRequest.current = {
        namespaceId: targetNamespace,
        source,
        promise,
      };
      return promise;
    },
    [namespaceId]
  );
  const refresh = useCallback(
    (options?: { force?: boolean }) => fetchQuota(true, options?.force),
    [fetchQuota]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setState({ namespaceId, data: null, loading: true });
    void fetchQuota();

    return () => {
      activeRequest.current?.source.cancel();
      activeRequest.current = null;
    };
  }, [fetchQuota, namespaceId]);

  if (state.namespaceId !== namespaceId) {
    return { data: null, loading: true, refresh };
  }

  return {
    data: state.data,
    loading: state.loading,
    refresh,
  };
}
