import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AppleIcon } from '@/assets/icons/AppleIcon';
import { Button } from '@/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { getLangOnly } from '@/lib/lang';
import { http } from '@/lib/request';
import { completeAuthRedirect } from '@/page/inviteReferral/completeAuth';

import { useAgreementConsent } from '../AgreementConsent';

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

interface IProps {
  mode?: 'login' | 'register';
  iconOnly?: boolean;
}

type AppleConfigStatus = 'loading' | 'ready' | 'error';

export default function Apple(props: IProps) {
  const { mode = 'login', iconOnly = false } = props;
  const { t, i18n } = useTranslation();
  const { runWithConsent } = useAgreementConsent();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configStatus, setConfigStatus] =
    useState<AppleConfigStatus>('loading');
  // The agreement dialog keeps the click callback. Confirmation reads this ref
  // instead of the config captured when the dialog opened.
  const authConfigRef = useRef<any>(null);
  const configRequestRef = useRef(0);
  const configLoadingRef = useRef(false);
  const signingInRef = useRef(false);

  // Load Apple SDK
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

  const loadAuthConfig = useCallback(() => {
    const requestId = ++configRequestRef.current;
    configLoadingRef.current = true;
    authConfigRef.current = null;
    setConfigStatus('loading');
    http
      .get('/apple/auth-config')
      .then(config => {
        if (requestId !== configRequestRef.current) return;
        authConfigRef.current = config;
        setConfigStatus('ready');
      })
      .catch(() => {
        if (requestId !== configRequestRef.current) return;
        authConfigRef.current = null;
        setConfigStatus('error');
      })
      .finally(() => {
        if (requestId === configRequestRef.current) {
          configLoadingRef.current = false;
        }
      });
  }, []);

  // Prefetch once the SDK is ready so confirmation never waits on the network.
  useEffect(() => {
    if (!sdkLoaded) return;
    loadAuthConfig();
    return () => {
      configRequestRef.current += 1;
      configLoadingRef.current = false;
    };
  }, [sdkLoaded, loadAuthConfig]);

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
        .then(async res => {
          await completeAuthRedirect(res, redirect);
        });
    };
    const handleFailure = (event: CustomEvent) => {
      const errorCode = event.detail.error;
      if (
        ['user_cancelled_authorize', 'popup_closed_by_user'].includes(errorCode)
      ) {
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
  }, [t, i18n.language, redirect]);

  const label = t(
    mode === 'register'
      ? 'register.register_use_apple'
      : 'login.login_use_apple'
  );

  const loginWithApple = () => {
    const config = authConfigRef.current;
    if (!config || !window.AppleID || signingInRef.current) return;

    signingInRef.current = true;
    setLoading(true);
    try {
      window.AppleID.auth.init({
        clientId: config.client_id,
        scope: config.scope || 'name email',
        redirectURI: config.redirect_u_r_i,
        state: config.state,
        nonce: config.nonce,
        usePopup: true,
      });
      void Promise.resolve(window.AppleID.auth.signIn()).finally(() => {
        signingInRef.current = false;
        setLoading(false);
      });
    } catch {
      signingInRef.current = false;
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (configLoadingRef.current || signingInRef.current) return;
    if (!authConfigRef.current) {
      loadAuthConfig();
      return;
    }
    runWithConsent(loginWithApple);
  };

  const button = (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={
        !sdkLoaded ||
        loading ||
        (configStatus !== 'ready' && configStatus !== 'error')
      }
      aria-label={iconOnly ? label : undefined}
      className={
        iconOnly ? 'h-9 w-full px-0 [&_svg]:size-5' : 'w-full [&_svg]:size-5'
      }
    >
      <AppleIcon />
      <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
    </Button>
  );

  if (!iconOnly) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
