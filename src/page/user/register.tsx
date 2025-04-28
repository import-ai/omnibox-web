import WrapperPage from './wrapper';
import { useTranslation } from 'react-i18next';
import { RegisterForm } from '@/page/user/form/register';

export default function RegisterPage() {
  const { t } = useTranslation();

  return (
    <WrapperPage>
      <div className="flex flex-col space-y-2 text-center mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('register.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('register.description')}
        </p>
      </div>
      <RegisterForm />
    </WrapperPage>
  );
}
