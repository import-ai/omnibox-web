import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import logoUrl from '@/assets/logo.svg';
import useConfig from '@/hooks/useConfig';
import { http } from '@/lib/request';

import GenerateForm from '../settings/tabs/account/GenerateForm';

export default function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { config, loading } = useConfig();

  useEffect(() => {
    if (loading || !localStorage.getItem('uid')) return;

    let active = true;
    const endpoint = config.commercial ? 'pro-namespaces' : 'namespaces';
    http
      .get(endpoint)
      .then(namespaces => {
        if (active && Array.isArray(namespaces) && namespaces.length > 0) {
          navigate(`/${namespaces[0].id}/chat`, { replace: true });
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [config.commercial, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="flex flex-col items-center space-y-4">
          <img src={logoUrl} alt="Logo" className="size-12" />
          <h1 className="text-2xl font-semibold text-foreground">
            {t('welcome.title')}
          </h1>
          <p className="text-center text-sm text-muted-foreground">
            {t('welcome.description')}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <GenerateForm />
        </div>
      </div>
    </div>
  );
}
