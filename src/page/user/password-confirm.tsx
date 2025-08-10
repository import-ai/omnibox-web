import { useTranslation } from 'react-i18next';

import { ForgotPasswordForm } from '@/page/user/form/password-confirm';

import WrapperPage from './wrapper';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <WrapperPage>
      <div className="flex flex-col space-y-2 text-center pt-10 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('password.conform_title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('password.conform_description')}
        </p>
      </div>
      <ForgotPasswordForm />
    </WrapperPage>
  );
}
