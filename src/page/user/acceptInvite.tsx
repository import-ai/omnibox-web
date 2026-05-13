import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

import MetaPage from './meta';
import WrapperPage from './wrapper';

export default function AcceptInvitePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get('token');

  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const uid = localStorage.getItem('uid');
    if (uid) {
      navigate('/', { replace: true });
      return;
    }

    // If no token provided, redirect to login
    if (!token) {
      navigate('/user/login', { replace: true });
      return;
    }

    // Auto-accept invitation
    acceptInvitation(token);
  }, [token]);

  const acceptInvitation = async (inviteToken: string) => {
    setIsAccepting(true);
    setError('');

    try {
      const response = await http.post(
        'auth/accept-invite',
        { lang: localStorage.getItem('i18nextLng') },
        {
          params: { token: inviteToken },
        }
      );

      setGlobalCredential(response.id, response.access_token);

      // Redirect to the invited namespace
      if (response.namespaceId) {
        navigate(`/${response.namespaceId}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setIsAccepting(false);
      const errorMessage =
        err.response?.data?.message || t('accept_invite.error_accept');
      setError(errorMessage);
      toast.error(errorMessage, { position: 'bottom-right' });
    }
  };

  return (
    <WrapperPage extra={<MetaPage />}>
      <div className="flex flex-col items-center justify-center gap-6 pt-10">
        <div className="flex flex-col items-center gap-2 text-center">
          {isAccepting ? (
            <>
              <h1 className="text-2xl font-bold">
                {t('accept_invite.accepting')}
              </h1>
              <p className="text-balance text-sm text-muted-foreground">
                {t('accept_invite.accepting_description')}
              </p>
            </>
          ) : error ? (
            <>
              <h1 className="text-2xl font-bold">
                {t('accept_invite.error_title')}
              </h1>
              <p className="text-balance text-sm text-muted-foreground">
                {error}
              </p>
              <button
                onClick={() => navigate('/user/login')}
                className="mt-4 text-sm text-primary hover:underline"
              >
                {t('accept_invite.back_to_login')}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </WrapperPage>
  );
}
