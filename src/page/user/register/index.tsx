import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { TooltipProvider } from '@/components/tooltip';

import Apple from '../apple';
import { Available } from '../available';
import Email from '../email';
import Google from '../google';
import MetaPage from '../MetaPage';
import Phone from '../phone';
import WeChat from '../wechat';
import { useH5WechatAuthPoll } from '../wechat/h5WechatAuthSync';
import Scan from '../wechat/Scan';
import WrapperPage from '../WrapperPage';
import { RegisterForm } from './RegisterForm';

export type ContactMethod = 'email' | 'phone';

export default function RegisterPage() {
  const [scan, onScan] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const modeParam = params.get('mode');

  const getInitialContactMethod = (): ContactMethod => {
    if (modeParam === 'email') return 'email';
    return 'phone';
  };

  const [contactMethod, setContactMethod] = useState<ContactMethod>(
    getInitialContactMethod
  );

  useH5WechatAuthPoll();

  useEffect(() => {
    const uid = localStorage.getItem('uid');
    if (uid) {
      navigate('/', { replace: true });
    }
  }, [navigate, params]);

  return (
    <WrapperPage layout="split" extra={<MetaPage />} showAppDownload>
      {scan ? (
        <Scan onScan={onScan} />
      ) : (
        <RegisterForm contactMethod={contactMethod}>
          <Available>
            {available => {
              return (
                <div className="grid gap-6">
                  <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                    <span className="bg-background text-muted-foreground relative z-10 px-2">
                      {t('login.or_continue')}
                    </span>
                  </div>
                  <TooltipProvider>
                    <div className="grid grid-cols-4 gap-2">
                      {contactMethod === 'phone' ? (
                        <Email
                          onClick={() => setContactMethod('email')}
                          mode="register"
                          iconOnly
                        />
                      ) : (
                        <Phone
                          onClick={() => setContactMethod('phone')}
                          mode="register"
                          iconOnly
                        />
                      )}
                      {available.wechat && (
                        <WeChat onScan={onScan} mode="register" iconOnly />
                      )}
                      {available.google && <Google mode="register" iconOnly />}
                      {available.apple && <Apple mode="register" iconOnly />}
                    </div>
                  </TooltipProvider>
                </div>
              );
            }}
          </Available>
        </RegisterForm>
      )}
    </WrapperPage>
  );
}
