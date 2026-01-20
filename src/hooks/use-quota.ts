import axios from 'axios';
import { useEffect, useState } from 'react';

import { http } from '@/lib/request';

export interface UsageData {
  storage: {
    upload: number;
    file: number;
    other_users: number;
    total: number;
  };
  video_audio_parse: {
    video: number;
    audio: number;
    other_users: number;
    total: number;
  };
  doc_parse: {
    pdf: number;
    image: number;
    other_users: number;
    total: number;
  };
  expire_date?: Date | null;
}

export default function useQuota(namespaceId: string) {
  const [data, setData] = useState<UsageData>({
    storage: {
      upload: 0,
      file: 0,
      other_users: 0,
      total: 0,
    },
    video_audio_parse: {
      video: 0,
      audio: 0,
      other_users: 0,
      total: 0,
    },
    doc_parse: {
      pdf: 0,
      image: 0,
      other_users: 0,
      total: 0,
    },
  });

  const fetchQuota = () => {
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/usages`, {
        cancelToken: source.token,
      })
      .then(setData);

    return () => {
      source.cancel();
    };
  };

  useEffect(() => {
    const cleanup = fetchQuota();
    return cleanup;
  }, [namespaceId]);

  return {
    data,
    refetch: fetchQuota,
  };
}
