import WrapperPage from './wrapper';
import { useTranslation } from 'react-i18next';
import { ForgotPasswordForm } from '@/page/user/form/password';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <WrapperPage>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('password.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('password.description')}
        </p>
      </div>
      <ForgotPasswordForm />
    </WrapperPage>
  );
}
