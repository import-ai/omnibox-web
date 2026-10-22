import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Spinner } from '@/components/ui/Spinner';
import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

import {
  leaveTo,
  PRICING_PATH,
  safeRedirect,
  takeLoginLinkCode,
} from './loginLink';
import WrapperPage from './WrapperPage';

interface RedeemedLoginLink {
  id: string;
  access_token: string;
  redirect: string;
}

/**
 * One-time purchase login link sent by the WeChat official account. The code
 * is in the hash so it never reaches a server log; it is removed from the
 * address bar before anything else and redeemed with a POST, so prefetching
 * the page does not use it up.
 */
export default function LoginLinkPage() {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = takeLoginLinkCode();
    if (!code) {
      setFailed(true);
      return;
    }
    http
      .post('/auth/login-links/redeem', { code }, { mute: true })
      .then((result: RedeemedLoginLink) => {
        setGlobalCredential(result.id, result.access_token);
        leaveTo(safeRedirect(result.redirect));
      })
      .catch(() => setFailed(true));
  }, []);

  return (
    <WrapperPage useCard={false}>
      {failed ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t('login_link.invalid')}
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
