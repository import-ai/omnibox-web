import WrapperPage from './wrapper';
import { useTranslation } from 'react-i18next';
import { RegisterConFirmForm } from '@/page/user/form/register-confirm';

export default function RegisterConFirmPage() {
  const { t } = useTranslation();

  return (
    <WrapperPage>
      <div className="flex flex-col space-y-2 text-center mb-5 pt-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('register.conform_title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('register.conform_description')}
        </p>
      </div>
      <RegisterConFirmForm />
    </WrapperPage>
  );
}
