import axios from 'axios';
import { useEffect, useState } from 'react';

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

export default function useQuota(namespaceId: string) {
  const [state, setState] = useState<QuotaState>({
    namespaceId,
    data: null,
    loading: true,
  });

  useEffect(() => {
    const source = axios.CancelToken.source();
    let active = true;

    setState({ namespaceId, data: null, loading: true });
    http
      .get(`/namespaces/${namespaceId}/usages`, {
        cancelToken: source.token,
      })
      .then((data: UsageData) => {
        if (active) {
          setState({ namespaceId, data, loading: false });
        }
      })
      .catch(() => {
        if (active) {
          setState({ namespaceId, data: null, loading: false });
        }
      });

    return () => {
      active = false;
      source.cancel();
    };
  }, [namespaceId]);

  if (state.namespaceId !== namespaceId) {
    return { data: null, loading: true };
  }

  return {
    data: state.data,
    loading: state.loading,
  };
}
