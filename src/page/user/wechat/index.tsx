import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { WeChatIcon } from '@/assets/icons/Wechat';
import { Button } from '@/components/button';
import { http } from '@/lib/request';

import { prepareH5WechatOAuthState } from './h5WechatAuthSync';
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
  const oauthState = params.get('oauth_state');
  const oauthDeviceToken = params.get('oauth_device_token');
  const isWeChat = navigator.userAgent.toLowerCase().includes('micromessenger');
  const useMiniProgramLaunch = isExternalMobileBrowser();
  const [launching, setLaunching] = useState(false);

  const loginWithWeChat = () => {
    if (isWeChat) {
      http
        .get('/wechat/auth-url', {
          params: {
            source: oauthState ? 'h5' : undefined,
            ...(redirect ? { redirect } : {}),
            ...(oauthState ? { state: oauthState } : {}),
            ...(oauthDeviceToken ? { device_token: oauthDeviceToken } : {}),
          },
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

  const handleMiniProgramLaunch = async () => {
    if (launching) {
      return;
    }

    setLaunching(true);
    try {
      const session = await prepareH5WechatOAuthState(redirect);
      launchWechatMiniProgram(
        () => {
          toast.error(t('login.wechat_h5_launch_failed'), {
            position: 'bottom-right',
          });
        },
        {
          redirect,
          oauthState: session.state,
          oauthDeviceToken: session.deviceToken,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('login.wechat_h5_launch_failed');
      toast.error(message, { position: 'bottom-right' });
    } finally {
      setLaunching(false);
    }
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
        disabled={launching}
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
