import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/button';
import { http } from '@/lib/request';

export function InviteForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const userId = params.get('user');
  const namespaceId = params.get('namespace');
  const [data, onData] = useState<{
    namespace: string;
    username: string;
  }>({
    namespace: '--',
    username: '--',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginMessage, setShowLoginMessage] = useState(false);
  const [userMismatchMessage, setUserMismatchMessage] = useState<string | null>(
    null
  );

  // Decode JWT token to get invited user ID
  const getInvitedUserId = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId;
    } catch {
      return null;
    }
  };

  const handleSubmit = () => {
    setIsLoading(true);
    http
      .post('invite/confirm', { token })
      .then(() => {
        navigate('/', { replace: true });
      })
      .catch(error => {
        if (error.response?.status === 403) {
          setUserMismatchMessage(error.response.data.message);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (!namespaceId || !userId || !token) {
      return;
    }

    // Validate user identity before making API calls
    const invitedUserId = getInvitedUserId(token);
    const currentUserId = localStorage.getItem('uid');

    if (!currentUserId) {
      setShowLoginMessage(true);
      return;
    }

    if (invitedUserId && invitedUserId !== currentUserId) {
      // Fetch invited user's username to display in error message
      http
        .get(`user/${invitedUserId}`)
        .then(user => {
          setUserMismatchMessage(
            t('invite.user_mismatch', { username: user.username })
          );
        })
        .catch(() => {
          setUserMismatchMessage(t('invite.user_mismatch_generic'));
        });
      return;
    }

    const source = axios.CancelToken.source();
    Promise.all(
      [`namespaces/${namespaceId}`, `user/${userId}`].map(uri =>
        http.get(uri, { cancelToken: source.token })
      )
    )
      .then(([namespace, user]) => {
        onData({
          namespace: namespace.name,
          username: user.username,
        });
      })
      .catch(error => {
        if (axios.isCancel(error)) {
          return;
        }
        if (error.response?.status === 401) {
          setShowLoginMessage(true);
        }
      });
    return () => {
      source.cancel();
    };
  }, [token, namespaceId, userId, t]);

  if (!token || !namespaceId || !userId) {
    return (
      <div className="text-center text-sm">
        <p>{t('form.invalid_request')}</p>
      </div>
    );
  }

  if (showLoginMessage) {
    return (
      <div className="text-center text-sm space-y-4">
        <p>{t('invite.please_login_first')}</p>
        <Button
          className="w-full"
          onClick={() =>
            navigate(
              `/user/login?redirect=${encodeURIComponent(location.href)}`
            )
          }
        >
          {t('user.login')}
        </Button>
      </div>
    );
  }

  if (userMismatchMessage) {
    return (
      <div className="text-center text-sm pt-6">
        <p>{userMismatchMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-10">
      <div className="text-center">
        {t('invite.join', { user: data.username, namespace: data.namespace })}
      </div>
      <Button
        type="submit"
        className="w-full disabled:opacity-60"
        loading={isLoading}
        onClick={handleSubmit}
      >
        {t('invite.add_namespace')}
      </Button>
    </div>
  );
}
