import { Check, Monitor } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/button';
import { http } from '@/lib/request';
import { removeGlobalCredential } from '@/page/user/util';
import WrapperPage from '@/page/user/WrapperPage';

export default function OAuthAuthorizePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const query = params.toString();
  const [authenticated] = useState(() => !!localStorage.getItem('uid'));
  const [firstParty, setFirstParty] = useState(false);
  const [account, setAccount] = useState<{
    id: string;
    username: string;
    email?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [callback, setCallback] = useState('');
  const callbackLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (callback) callbackLink.current?.click();
  }, [callback]);
  const [failed, setFailed] = useState(false);
  const returnPath = `/oauth/authorize?${query}`;
  const loginPath = `/user/login?${new URLSearchParams({ redirect: returnPath })}`;

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    http
      .get('/oauth/authorize/context', {
        params: Object.fromEntries(new URLSearchParams(query)),
      })
      .then(async context => {
        if (!active) return;
        if (context.client.first_party) {
          setFirstParty(true);
          setAccount(context.account);
        } else {
          const result = await http.get('/oauth/authorize', {
            params: Object.fromEntries(new URLSearchParams(query)),
          });
          if (active) location.assign(result.redirect_url);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticated, query]);

  const authorize = async () => {
    setPending(true);
    setFailed(false);
    try {
      const result = await http.post('/oauth/authorize', {
        ...Object.fromEntries(params),
        user_id: account!.id,
      });
      const url = new URL(result.redirect_url);
      if (
        url.protocol !== 'omnibox:' ||
        url.host !== 'oauth' ||
        url.username ||
        url.password ||
        url.pathname !== '/callback' ||
        url.searchParams.getAll('state').length !== 1 ||
        url.searchParams.get('state') !== params.get('state') ||
        url.searchParams.getAll('code').length !== 1 ||
        !/^[a-f0-9]{64}$/.test(url.searchParams.get('code') || '') ||
        url.hash
      )
        throw new Error('Invalid callback');
      setCallback(url.href);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  if (!authenticated) {
    return <Navigate to={loginPath} replace />;
  }
  return (
    <WrapperPage useCard={false}>
      <div className="flex flex-col items-center gap-6 px-4 py-8 text-center">
        {callback ? (
          <Check className="size-6" aria-hidden />
        ) : (
          <Monitor className="size-6 text-muted-foreground" aria-hidden />
        )}
        <div className="grid gap-3">
          <h1 className="text-2xl font-medium text-balance">
            {t(
              callback
                ? 'desktop_auth.ready'
                : firstParty
                  ? 'desktop_auth.title'
                  : 'login.authorizing'
            )}
          </h1>
          {firstParty && (
            <p className="text-sm text-muted-foreground">
              {t(
                callback
                  ? 'desktop_auth.return_hint'
                  : 'desktop_auth.confirm_hint'
              )}
            </p>
          )}
        </div>
        {loading && (
          <p role="status" className="text-sm text-muted-foreground">
            {t('login.authorizing')}
          </p>
        )}
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            {t('desktop_auth.failed')}
          </p>
        )}
        {firstParty && !loading && !callback && account && (
          <div className="grid w-full gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-transparent p-4 text-left">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background"
                aria-hidden
              >
                {(account.username || account.email || '?')
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 text-sm">
                <p className="break-words font-medium">{account.username}</p>
                <p className="break-all text-muted-foreground">
                  {account.email}
                </p>
              </div>
            </div>
            <Button className="h-11" onClick={authorize} loading={pending}>
              {t('desktop_auth.confirm')}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                removeGlobalCredential();
                location.replace(loginPath);
              }}
            >
              {t('desktop_auth.switch')}
            </Button>
          </div>
        )}
        {callback && (
          <Button asChild className="h-11 w-full">
            <a ref={callbackLink} href={callback}>
              {t('desktop_auth.return')}
            </a>
          </Button>
        )}
      </div>
    </WrapperPage>
  );
}
