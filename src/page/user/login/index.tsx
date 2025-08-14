import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Google from '../google';
import MetaPage from '../meta';
import WeChat from '../wechat';
import Scan from '../wechat/scan';
import WrapperPage from '../wrapper';
import { LoginForm } from './form';

export default function LoginPage() {
  const [scan, onScan] = useState(false);
  const { t } = useTranslation();

  return (
    <WrapperPage extra={<MetaPage />}>
      {scan ? (
        <Scan onScan={onScan} />
      ) : (
        <LoginForm>
          <div className="grid gap-6">
            <div className="flex flex-col gap-2">
              <WeChat onScan={onScan} />
              <Google />
            </div>
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-white dark:bg-[#171717] text-muted-foreground relative z-10 px-2">
                {t('login.or_continue')}
              </span>
            </div>
          </div>
        </LoginForm>
      )}
    </WrapperPage>
  );
}
