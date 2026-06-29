import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { WeChatIcon } from '@/assets/icons/Wechat';
import { Button } from '@/components/button';
import { http } from '@/lib/request';

import {
  isExternalMobileBrowser,
  launchWechatMiniProgram,
} from './launchMiniProgram';

interface IProps {
  onScan: (value: boolean) => void;
  mode?: 'login' | 'register';
}

export default function WeChat(props: IProps) {
  const { onScan, mode = 'login' } = props;
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const isWeChat = navigator.userAgent.toLowerCase().includes('micromessenger');
  const useMiniProgramLaunch = isExternalMobileBrowser();

  const loginWithWeChat = () => {
    if (isWeChat) {
      http
        .get('/wechat/auth-url', {
          params: redirect ? { redirect } : undefined,
        })
        .then(authUrl => {
          location.href = authUrl;
        })
        .catch(error => {
          toast.error(error.message, { position: 'bottom-right' });
        });
    } else {
      onScan(true);
    }
  };

  const handleMiniProgramLaunch = () => {
    launchWechatMiniProgram(
      () => {
        toast.error(t('login.wechat_h5_launch_failed'), {
          position: 'bottom-right',
        });
      },
      { redirect }
    );
  };

  const label = t(
    mode === 'register'
      ? 'register.register_use_wechat'
      : 'login.login_use_wechat'
  );

  if (useMiniProgramLaunch) {
    return (
      <Button
        variant="outline"
        onClick={handleMiniProgramLaunch}
        className="w-full [&_svg]:size-5 dark:[&_svg]:fill-white"
      >
        <WeChatIcon />
        {label}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={loginWithWeChat}
      className="w-full [&_svg]:size-5 dark:[&_svg]:fill-white"
    >
      <WeChatIcon />
      {label}
    </Button>
  );
}
