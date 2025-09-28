import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

import { GoogleIcon } from './icon';

export default function Google() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const loginWithGoogle = () => {
    http
      .get('/google/auth-url')
      .then(authUrl => {
        const width = 500;
        const height = 600;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        window.open(
          authUrl,
          'googleLogin',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
      })
      .catch(error => {
        toast.error(error.message, { position: 'bottom-right' });
      });
  };

  useEffect(() => {
    const messageFN = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const { code, state } = event.data;
      if (code && state) {
        http
          .post(`/google/callback`, {
            code,
            state,
            lang: i18n.language,
          })
          .then(res => {
            setGlobalCredential(res.id, res.access_token);
            navigate('/', { replace: true });
          })
          .catch(error => {
            toast.error(error.message, { position: 'bottom-right' });
          });
      }
    };
    window.addEventListener('message', messageFN);
    return () => {
      window.removeEventListener('message', messageFN);
    };
  }, []);

  return (
    <Button
      variant="outline"
      onClick={loginWithGoogle}
      className="w-full [&_svg]:size-5 dark:[&_svg]:fill-white"
    >
      <GoogleIcon />
      {t('login.login_use_google')}
    </Button>
  );
}
