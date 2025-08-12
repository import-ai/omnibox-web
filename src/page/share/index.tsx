import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ShareInfo } from '@/interface';
import { http } from '@/lib/request';

import SharedResourcePage from '../shared-resource';

export default function SharePage() {
  const params = useParams();
  const navigate = useNavigate();
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
      .then(setShareInfo)
      .catch(err => {
        if (err && err.status && err.status === 401) {
          // Share requires login, redirect to login page with current URL as redirect
          const currentUrl = encodeURIComponent(window.location.pathname);
          navigate(`/user/login?redirect=${currentUrl}`);
        }
      });
    return () => source.cancel();
  }, [shareId, navigate]);

  return <SharedResourcePage shareInfo={shareInfo} />;
}
