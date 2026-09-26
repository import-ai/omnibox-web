import { Check, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/button';
import { Spinner } from '@/components/ui/Spinner';
import { http } from '@/lib/request';
import { removeGlobalCredential } from '@/page/user/util';
import WrapperPage from '@/page/user/WrapperPage';

const DESKTOP_CLIENT_ID = 'omnibox-desktop';

interface Account {
  id: string;
  username: string;
  email?: string;
}

export default function OAuthAuthorizePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const search = params.toString();
  const query = Object.fromEntries(params);
  const authenticated = !!localStorage.getItem('uid');
  const desktop = query.client_id === DESKTOP_CLIENT_ID;
  const loginPath = `/user/login?${new URLSearchParams({
    redirect: `/oauth/authorize?${search}`,
  })}`;
  const [account, setAccount] = useState<Account | null>(null);
  const [callback, setCallback] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    const request = desktop
      ? http
          .get('/oauth/authorize/context', { params: query })
          .then(context => active && setAccount(context.account))
      : http
          .get('/oauth/authorize', { params: query })
          .then(result => active && location.assign(result.redirect_url));
    request.catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [authenticated, search]);

  const authorize = async () => {
    setPending(true);
    setFailed(false);
    try {
      const result = await http.post('/oauth/authorize', {
        ...query,
        user_id: account!.id,
      });
      if (new URL(result.redirect_url).protocol !== 'omnibox:') {
        throw new Error('Invalid callback');
      }
      setCallback(result.redirect_url);
      location.href = result.redirect_url;
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  if (!authenticated) {
    return <Navigate to={loginPath} replace />;
  }
  if (!desktop) {
    return (
      <WrapperPage useCard={false}>
        {failed ? (
          <div className="flex gap-2 justify-center items-center">
            {t('form.invalid_request')}
          </div>
        ) : (
          <div className="flex font-bold gap-2 justify-center items-center">
            <Spinner />
            {t('login.authorizing')}
          </div>
        )}
      </WrapperPage>
    );
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
            {t(callback ? 'desktop_auth.ready' : 'desktop_auth.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              callback
                ? 'desktop_auth.return_hint'
                : 'desktop_auth.confirm_hint'
            )}
          </p>
        </div>
        {!account && !failed && (
          <p role="status" className="text-sm text-muted-foreground">
            {t('login.authorizing')}
          </p>
        )}
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            {t('desktop_auth.failed')}
          </p>
        )}
        {callback ? (
          <Button asChild className="h-11 w-full">
            <a href={callback}>{t('desktop_auth.return')}</a>
          </Button>
        ) : (
          account && (
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
          )
        )}
      </div>
    </WrapperPage>
  );
}
