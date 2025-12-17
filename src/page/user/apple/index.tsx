import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AppleIcon } from '@/assets/icons/apple';
import { Button } from '@/components/button';
import { getLangOnly } from '@/lib/lang';
import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

declare global {
  interface Window {
    AppleID: {
      auth: {
        init: (config: any) => void;
        signIn: () => Promise<any>;
      };
    };
  }
}

interface AppleAuthResponse {
  authorization: {
    code: string;
    id_token: string;
    state: string;
  };
  user?: {
    email: string;
    name?: {
      firstName: string;
      lastName: string;
    };
  };
}

export default function Apple() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.AppleID) {
      setSdkLoaded(true);
      return;
    }

    const lang = getLangOnly(i18n);
    const locale = lang === 'zh' ? 'zh_CN' : 'en_US';
    const scriptSrc = `https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/${locale}/appleid.auth.js`;

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setSdkLoaded(true);
    };

    script.onerror = () => {
      toast.error(t('login.apple_sdk_not_loaded'), {
        position: 'bottom-right',
      });
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.remove();
      }
    };
  }, [i18n, t]);

  useEffect(() => {
    const handleSuccess = (event: CustomEvent) => {
      const data = event.detail.data as AppleAuthResponse;
      http
        .post('/apple/callback', {
          code: data.authorization.code,
          id_token: data.authorization.id_token,
          state: data.authorization.state,
          user: data.user,
          lang: i18n.language,
        })
        .then(res => {
          setGlobalCredential(res.id, res.access_token);
          navigate('/', { replace: true });
        })
        .catch(error => {
          toast.error(error.message || t('login.apple_signin_failed'), {
            position: 'bottom-right',
          });
        });
    };
    const handleFailure = (event: CustomEvent) => {
      const errorCode = event.detail.error;
      if (
        ['user_cancelled_authorize', 'popup_closed_by_user'].includes(errorCode)
      ) {
        toast.error(t('login.popup_closed_by_user'), {
          position: 'bottom-right',
        });
        return;
      }
      toast.error(t('login.apple_signin_failed'), {
        position: 'bottom-right',
      });
    };
    document.addEventListener(
      'AppleIDSignInOnSuccess',
      handleSuccess as EventListener
    );
    document.addEventListener(
      'AppleIDSignInOnFailure',
      handleFailure as EventListener
    );
    return () => {
      document.removeEventListener(
        'AppleIDSignInOnSuccess',
        handleSuccess as EventListener
      );
      document.removeEventListener(
        'AppleIDSignInOnFailure',
        handleFailure as EventListener
      );
    };
  }, [t, i18n.language]);

  const loginWithApple = async () => {
    if (!sdkLoaded) {
      toast.error(t('login.apple_sdk_not_loaded'), {
        position: 'bottom-right',
      });
      return;
    }

    setLoading(true);
    try {
      const config = await http.get('/apple/auth-config');

      if (!window.AppleID) {
        toast.error(t('login.apple_sdk_not_loaded'), {
          position: 'bottom-right',
        });
        return;
      }

      window.AppleID.auth.init({
        clientId: config.client_id,
        scope: config.scope || 'name email',
        redirectURI: config.redirect_u_r_i,
        state: config.state,
        nonce: config.nonce,
        usePopup: true,
      });

      await window.AppleID.auth.signIn();
    } catch {
      // do nothing
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={loginWithApple}
      disabled={!sdkLoaded || loading}
      className="w-full [&_svg]:size-5"
    >
      <AppleIcon className="scale-125" />
      {loading ? t('login.authorizing') : t('login.login_use_apple')}
    </Button>
  );
}
