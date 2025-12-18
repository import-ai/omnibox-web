import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getLangOnly } from '@/lib/lang';
import { http } from '@/lib/request';

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

interface AppleLoginProps {
  onSuccess?: () => void;
}

export function AppleLogin({ onSuccess }: AppleLoginProps) {
  const { t, i18n } = useTranslation();
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
      const data = event.detail as AppleAuthResponse;
      http
        .post('/apple/callback', {
          code: data.authorization.code,
          id_token: data.authorization.id_token,
          state: data.authorization.state,
          user: data.user,
          lang: i18n.language,
        })
        .then(() => {
          toast(t('setting.third_party_account.bound'), {
            position: 'bottom-right',
          });
          onSuccess?.();
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
  }, [t, i18n.language, onSuccess]);

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
    <button
      onClick={loginWithApple}
      disabled={!sdkLoaded || loading}
      className="flex h-[30px] w-[71px] shrink-0 items-center justify-center rounded-md bg-foreground text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
    >
      {t('setting.bind_btn')}
    </button>
  );
}
