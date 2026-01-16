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
import { RegisterForm } from './form';

export type ContactMethod = 'email' | 'phone';

export default function RegisterPage() {
  const [scan, onScan] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phoneParam = params.get('phone');
  const modeParam = params.get('mode');

  // Get initial contact method from URL params
  const getInitialContactMethod = (): ContactMethod => {
    if (modeParam === 'phone' || phoneParam) return 'phone';
    return 'email';
  };

  const [contactMethod, setContactMethod] = useState<ContactMethod>(
    getInitialContactMethod
  );

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
        <RegisterForm contactMethod={contactMethod}>
          <Available>
            {available => {
              const hasOtherOptions =
                available.wechat || available.google || available.apple;

              if (!hasOtherOptions) {
                return null;
              }

              return (
                <div className="grid gap-6">
                  <div className="flex flex-col gap-2">
                    {contactMethod === 'phone' ? (
                      <Email
                        onClick={() => setContactMethod('email')}
                        mode="register"
                      />
                    ) : (
                      <Phone
                        onClick={() => setContactMethod('phone')}
                        mode="register"
                      />
                    )}
                    {available.wechat && (
                      <WeChat onScan={onScan} mode="register" />
                    )}
                    {available.google && <Google mode="register" />}
                    {available.apple && <Apple mode="register" />}
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
        </RegisterForm>
      )}
    </WrapperPage>
  );
}
