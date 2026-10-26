import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Spinner } from '@/components/ui/Spinner';
import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

import {
  failureKind,
  isWechatBrowser,
  leaveTo,
  type LoginLinkFailure,
  PRICING_PATH,
  safeRedirect,
  saveOAuthState,
  takeOAuthCallback,
} from './loginLink';
import WrapperPage from './WrapperPage';

interface WechatOaLogin {
  id: string;
  access_token: string;
  redirect: string;
}

interface WechatOaAuthorize {
  auth_url: string;
  state: string;
}

const FAILURE_MESSAGES: Record<LoginLinkFailure, string> = {
  not_wechat: 'login_link.not_wechat',
  not_bound: 'login_link.not_bound',
  not_owner: 'login_link.not_owner',
  too_frequent: 'login_link.too_frequent',
  failed: 'login_link.failed',
};

/**
 * Purchase link sent by the WeChat official account. It carries no secret:
 * the page runs a silent WeChat OAuth and signs in as whichever account the
 * WeChat user is bound to now, then goes to that namespace's pricing page.
 */
export default function LoginLinkPage() {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<LoginLinkFailure | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const callback = takeOAuthCallback();
    if (callback) {
      if (!callback.valid) {
        setFailure('failed');
        return;
      }
      http
        .post(
          '/auth/wechat-oa-login',
          { code: callback.code, state: callback.state },
          { mute: true }
        )
        .then((result: WechatOaLogin) => {
          setGlobalCredential(result.id, result.access_token);
          leaveTo(safeRedirect(result.redirect));
        })
        .catch(error => setFailure(failureKind(error)));
      return;
    }
    if (!isWechatBrowser(window.navigator.userAgent)) {
      setFailure('not_wechat');
      return;
    }
    http
      .get('/auth/wechat-oa-login/authorize', { mute: true })
      .then((result: WechatOaAuthorize) => {
        saveOAuthState(result.state);
        leaveTo(result.auth_url);
      })
      .catch(() => setFailure('failed'));
  }, []);

  return (
    <WrapperPage useCard={false}>
      {failure ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t(FAILURE_MESSAGES[failure])}
          </p>
          <Button asChild>
            <a href={PRICING_PATH}>{t('login_link.go_pricing')}</a>
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 font-bold">
          <Spinner />
          {t('login.authorizing')}
        </div>
      )}
    </WrapperPage>
  );
}
