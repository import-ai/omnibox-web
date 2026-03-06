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
  basic: {
    expired: boolean;
    expire_date: Date | null;
  };
  premium?: {
    expired: boolean;
    expire_date: Date | null;
  };
  show_members_usage: boolean;
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
    basic: {
      expired: false,
      expire_date: null,
    },
    premium: {
      expired: false,
      expire_date: null,
    },
    show_members_usage: false,
  });

  useEffect(() => {
    http.get(`/namespaces/${namespaceId}/usages`).then(setData);
  }, []);

  return {
    data,
  };
}
