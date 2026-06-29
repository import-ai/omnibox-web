import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { getAuthSuccessRedirect } from '@/page/user/authRedirect';
import { setGlobalCredential } from '@/page/user/util';

export default function MpSessionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) {
      return;
    }
    attempted.current = true;

    const uid = params.get('mp_uid');
    const token = params.get('mp_token');
    const redirect = params.get('redirect');

    if (!uid || !token) {
      navigate('/user/login', { replace: true });
      return;
    }

    setGlobalCredential(uid, token);
    getAuthSuccessRedirect(redirect).then(path => {
      navigate(path, { replace: true });
    });
  }, [navigate, params]);

  return null;
}
