import axios from 'axios';
import { useEffect, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { ShareInfo } from '@/interface';
import { http } from '@/lib/request';

export default function SharePage() {
  const params = useParams();
  const shareId = params.share_id;

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

  // Get share info
  useEffect(() => {
    setShareInfo(null);
    const source = axios.CancelToken.source();
    http
      .get(`/shares/${shareId}`, {
        cancelToken: source.token,
      })
      .then(setShareInfo);
    return () => source.cancel();
  }, [shareId]);

  return <Outlet context={shareInfo} />;
}
