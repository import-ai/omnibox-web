import MetaPage from './meta';
import { toast } from 'sonner';
import { useState } from 'react';
import isMobile from 'ismobilejs';
import WrapperPage from '../wrapper';
import { http } from '@/lib/request';
import WeChatIcon from './wechat-icon';
import { MoveLeft } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from 'react-i18next';
import { ScanForm } from '@/page/user/login/scan';
import { LoginForm } from '@/page/user/login/form';

export default function LoginPage() {
  const { t } = useTranslation();
  const [scan, onScan] = useState(false);
  const userAgent = navigator.userAgent.toLowerCase();
  const isPhone = isMobile(userAgent).phone;
  const isWeChat = userAgent.includes('micromessenger');
  const handleBack = () => {
    onScan(false);
  };
  const alertDisableWeChatLogin = () => {
    toast(t('login.wechat_disabled'), { position: 'bottom-right' });
  };
  const loginWithWeChat = () => {
    if (isWeChat) {
      http.get('/wechat/auth-url').then((authUrl) => {
        location.href = authUrl;
      });
    } else {
      onScan(true);
    }
  };

  return (
    <WrapperPage extra={<MetaPage />}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">{t('login.title')}</h1>
          <p className="text-balance text-sm text-muted-foreground">
            {t(scan ? 'login.scan_description' : 'login.description')}
          </p>
        </div>
        {scan ? (
          <div className="flex flex-col items-center gap-4">
            <ScanForm />
            <Button
              variant="outline"
              onClick={handleBack}
              className="w-full [&_svg]:size-5 [&_svg]:relative [&_svg]:top-[2px] dark:[&_svg]:fill-white"
            >
              <MoveLeft />
              {t('login.back')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              {isPhone && !isWeChat ? (
                <Button
                  variant="outline"
                  onClick={alertDisableWeChatLogin}
                  className="w-full [&_svg]:size-5 [&_svg]:relative [&_svg]:top-[2px] dark:[&_svg]:fill-white opacity-50"
                >
                  <WeChatIcon />
                  {t('login.login_use_wechat')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={loginWithWeChat}
                  className="w-full [&_svg]:size-5 [&_svg]:relative [&_svg]:top-[2px] dark:[&_svg]:fill-white"
                >
                  <WeChatIcon />
                  {t('login.login_use_wechat')}
                </Button>
              )}
            </div>
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-white dark:bg-[#171717] text-muted-foreground relative z-10 px-2">
                {t('login.or_continue')}
              </span>
            </div>
            <LoginForm />
          </div>
        )}
      </div>
    </WrapperPage>
  );
}
