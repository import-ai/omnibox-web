import { useTranslation } from 'react-i18next';

import logoUrl from '@/assets/logo.svg';

import GenerateForm from '../sidebar/switcher/form/namespace';

export default function WelcomePage() {
  const { t } = useTranslation();

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
