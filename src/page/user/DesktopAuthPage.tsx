import { Check, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/button';
import { http } from '@/lib/request';

import { removeGlobalCredential } from './util';
import WrapperPage from './WrapperPage';

export default function DesktopAuthPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const transaction = params.get('transaction') || '';
  const [account, setAccount] = useState<{
    id: string;
    username: string;
    email?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [callback, setCallback] = useState('');
  const [failed, setFailed] = useState(false);
  const valid = /^[a-f0-9]{64}$/.test(transaction);
  const returnPath = `/user/desktop-auth?${new URLSearchParams({ transaction })}`;
  const loginPath = `/user/login?${new URLSearchParams({ redirect: returnPath })}`;

  useEffect(() => {
    const id = localStorage.getItem('uid');
    if (!id || !valid) {
      setLoading(false);
      return;
    }
    http
      .get(`user/${id}`)
      .then(setAccount)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [valid]);

  const authorize = async () => {
    setPending(true);
    setFailed(false);
    try {
      const result = await http.post('/desktop-auth/authorize', {
        transaction,
        user_id: account!.id,
      });
      const url = new URL(result.callback_url);
      if (
        !/^omnibox-auth-(test|pre|prod):$/.test(url.protocol) ||
        url.host !== 'login' ||
        url.username ||
        url.password ||
        url.pathname ||
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

  if (valid && !loading && !account && !failed) {
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
        {loading && valid && (
          <p role="status" className="text-sm text-muted-foreground">
            {t('login.authorizing')}
          </p>
        )}
        {(!valid || failed) && (
          <p role="alert" className="text-sm text-destructive">
            {t('desktop_auth.failed')}
          </p>
        )}
        {valid && !loading && !callback && account && (
          <div className="grid w-full gap-3">
            <div className="flex items-center gap-3 rounded-lg bg-muted p-4 text-left">
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
              variant="ghost"
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
            <a href={callback}>{t('desktop_auth.return')}</a>
          </Button>
        )}
      </div>
    </WrapperPage>
  );
}
