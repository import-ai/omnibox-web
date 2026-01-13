import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Apple from '../apple';
import { Available } from '../available';
import Email from '../email';
import Google from '../google';
import MetaPage from '../meta';
import Phone from '../phone';
import WeChat from '../wechat';
import Scan from '../wechat/scan';
import WrapperPage from '../wrapper';
import { LoginForm } from './form';

export type LoginMode =
  | 'email-otp'
  | 'email-password'
  | 'phone-otp'
  | 'phone-password';

export default function LoginPage() {
  const [scan, onScan] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phoneParam = params.get('phone');

  // Start with appropriate mode based on URL params
  const getInitialMode = (): LoginMode => {
    if (phoneParam) return 'phone-otp';
    return 'email-otp';
  };

  const [mode, setMode] = useState<LoginMode>(getInitialMode);

  const isPhoneMode = mode === 'phone-otp' || mode === 'phone-password';

  useEffect(() => {
    const uid = localStorage.getItem('uid');
    if (uid) {
      navigate('/', { replace: true });
    }
  }, []);

  return (
    <WrapperPage extra={<MetaPage />}>
      {scan ? (
        <Scan onScan={onScan} />
      ) : (
        <LoginForm mode={mode} setMode={setMode}>
          <Available>
            {available => {
              const hasOtherOptions =
                (isPhoneMode ? true : true) ||
                available.wechat ||
                available.google ||
                available.apple;

              if (!hasOtherOptions) {
                return null;
              }

              return (
                <div className="grid gap-6">
                  <div className="flex flex-col gap-2">
                    {isPhoneMode ? (
                      <Email
                        onClick={() => setMode('email-otp')}
                        mode="login"
                      />
                    ) : (
                      <Phone
                        onClick={() => setMode('phone-otp')}
                        mode="login"
                      />
                    )}
                    {available.wechat && <WeChat onScan={onScan} />}
                    {available.google && <Google />}
                    {available.apple && <Apple />}
                  </div>
                  <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                    <span className="bg-white dark:bg-[#171717] text-muted-foreground relative z-10 px-2">
                      {t('login.or_continue')}
                    </span>
                  </div>
                </div>
              );
            }}
          </Available>
        </LoginForm>
      )}
    </WrapperPage>
  );
}
