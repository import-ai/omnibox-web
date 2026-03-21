import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Spinner } from '@/components/ui/spinner';
import { http } from '@/lib/request';
import WrapperPage from '@/page/user/wrapper';

export default function OAuthAuthorizePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem('uid');

    // Not authenticated - redirect to login
    if (!uid) {
      const currentUrl = window.location.href;
      navigate(`/user/login?redirect=${encodeURIComponent(currentUrl)}`, {
        replace: true,
      });
      return;
    }

    // Extract OAuth params and call backend
    http
      .get('/oauth/authorize', {
        params: {
          response_type: params.get('response_type'),
          client_id: params.get('client_id'),
          redirect_uri: params.get('redirect_uri'),
          scope: params.get('scope'),
          state: params.get('state'),
          code_challenge: params.get('code_challenge'),
          code_challenge_method: params.get('code_challenge_method'),
        },
      })
      .then(response => {
        window.location.href = response.redirect_url;
      })
      .catch(() => {
        setError(t('form.invalid_request'));
      });
  }, []);

  return (
    <WrapperPage useCard={false}>
      {error ? (
        <div className="flex gap-2 justify-center items-center">{error}</div>
      ) : (
        <div className="flex font-bold gap-2 justify-center items-center">
          <Spinner />
          {t('login.authorizing')}
        </div>
      )}
    </WrapperPage>
  );
}
