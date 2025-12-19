import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Apple from '../apple';
import { Available } from '../available';
import Google from '../google';
import MetaPage from '../meta';
import WeChat from '../wechat';
import Scan from '../wechat/scan';
import WrapperPage from '../wrapper';
import { RegisterForm } from './form';

export default function RegisterPage() {
  const [scan, onScan] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

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
        <RegisterForm>
          <Available>
            {available => {
              if (Object.keys(available).length <= 0) {
                return null;
              }
              return (
                <div className="grid gap-6">
                  <div className="flex flex-col gap-2">
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
