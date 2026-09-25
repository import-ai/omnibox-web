import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/button';
import { http } from '@/lib/request';

import Apple from './apple';
import Google from './google';
import { removeGlobalCredential } from './util';
import { ScanForm } from './wechat/ScanForm';
import WrapperPage from './WrapperPage';

export default function DesktopAuthPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const transaction = params.get('transaction') || '';
  const provider = params.get('provider');
  const [account, setAccount] = useState<{
    id: string;
    username: string;
    email?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [callback, setCallback] = useState('');
  const [failed, setFailed] = useState(false);
  const valid =
    /^[a-f0-9]{64}$/.test(transaction) &&
    ['google', 'apple', 'wechat'].includes(provider || '');
  const returnPath = `/user/desktop-auth?${new URLSearchParams({ transaction, provider: provider || '' })}`;

  useEffect(() => {
    if (!valid) return;
    if (params.get('redirect') !== returnPath) {
      setParams(
        { transaction, provider: provider!, redirect: returnPath },
        { replace: true }
      );
    }
  }, [valid, params, provider, returnPath, setParams, transaction]);

  useEffect(() => {
    const id = localStorage.getItem('uid');
    if (!id) {
      setLoading(false);
      return;
    }
    http
      .get(`user/${id}`)
      .then(setAccount)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <WrapperPage>
      <div className="grid gap-4">
        {loading && valid && <p role="status">{t('login.authorizing')}</p>}
        <h1 className="text-xl font-semibold">{t('desktop_auth.title')}</h1>
        {!valid || failed ? (
          <p role="alert">{t('desktop_auth.failed')}</p>
        ) : null}
        {valid && !loading && !callback && account && (
          <>
            <p>
              {t('desktop_auth.account', {
                account: account.email || account.username,
              })}
            </p>
            <Button onClick={authorize} disabled={pending}>
              {t('desktop_auth.confirm')}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                removeGlobalCredential();
                location.replace(returnPath);
              }}
            >
              {t('desktop_auth.switch')}
            </Button>
          </>
        )}
        {valid &&
          !loading &&
          !account &&
          params.get('redirect') === returnPath && (
            <>
              <p>{t('desktop_auth.browser')}</p>
              {provider === 'google' && <Google />}
              {provider === 'apple' && <Apple />}
              {provider === 'wechat' && <ScanForm />}
            </>
          )}
        {callback && (
          <>
            <a className="text-primary underline" href={callback}>
              {t('desktop_auth.return')}
            </a>
            <p role="status">{t('desktop_auth.return_hint')}</p>
          </>
        )}
      </div>
    </WrapperPage>
  );
}
