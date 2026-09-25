import { ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';

import type { EmbeddedAuth } from './EmbeddedAuthContext';
import WrapperPage from './WrapperPage';

export default function DesktopLoginPage({ host }: { host: EmbeddedAuth }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const attempt = useRef(0);
  const slogan = t('desktop_auth.slogan');
  useEffect(
    () => () => {
      attempt.current++;
    },
    []
  );
  const login = async (target: 'browser' | 'clipboard' = 'browser') => {
    const current = ++attempt.current;
    setPending(true);
    setFailed(false);
    try {
      await host.login(undefined, target);
    } catch {
      if (attempt.current === current) setFailed(true);
    } finally {
      if (attempt.current === current) setPending(false);
    }
  };
  const cancel = async () => {
    try {
      await host.cancel();
      attempt.current++;
      setPending(false);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };
  return (
    <WrapperPage useCard={false} contentClassName="max-w-2xl">
      <div className="flex flex-col items-center gap-6 px-4 py-8 text-center">
        <h1 className="whitespace-pre-line text-xl sm:text-2xl font-medium leading-relaxed">
          {pending ? t('desktop_auth.waiting_title') : slogan}
        </h1>
        <p
          className="text-sm text-muted-foreground"
          role={pending ? 'status' : undefined}
        >
          {pending ? t('desktop_auth.waiting') : t('desktop_auth.entry_hint')}
        </p>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            {t('desktop_auth.failed')}
          </p>
        )}
        <div className="grid w-full max-w-sm gap-3">
          <Button
            className="h-11 w-full"
            variant="default"
            onClick={() => void login()}
          >
            {pending && <ExternalLink className="size-4" />}
            {t(pending ? 'desktop_auth.reopen' : 'desktop_auth.open_browser')}
          </Button>
          {(pending || failed) && (
            <Button variant="outline" onClick={() => void login('clipboard')}>
              {t('desktop_auth.copy')}
            </Button>
          )}
          {pending && (
            <Button variant="outline" onClick={() => void cancel()}>
              {t('desktop_auth.cancel')}
            </Button>
          )}
        </div>
      </div>
    </WrapperPage>
  );
}
