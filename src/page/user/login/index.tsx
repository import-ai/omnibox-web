import MetaPage from './meta';
import WrapperPage from '../wrapper';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/page/user/login/form';

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <WrapperPage extra={<MetaPage />}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">{t('login.title')}</h1>
          <p className="text-balance text-sm text-muted-foreground">
            {t('login.description')}
          </p>
        </div>
        <div className="grid gap-6">
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-white dark:bg-[#171717] text-muted-foreground relative z-10 px-2">
              {t('login.or_continue')}
            </span>
          </div>
          <LoginForm />
        </div>
      </div>
    </WrapperPage>
  );
}
