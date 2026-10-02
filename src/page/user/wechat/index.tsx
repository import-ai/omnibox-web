import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { WeChatIcon } from '@/assets/icons/Wechat';
import { Button } from '@/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { http } from '@/lib/request';

import { prepareH5WechatOAuthState } from './h5WechatAuthSync';
import {
  isExternalMobileBrowser,
  launchWechatMiniProgram,
} from './launchMiniProgram';

interface IProps {
  onScan: (value: boolean) => void;
  mode?: 'login' | 'register';
  iconOnly?: boolean;
}

export default function WeChat(props: IProps) {
  const { onScan, mode = 'login', iconOnly = false } = props;
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const isWeChat = navigator.userAgent.toLowerCase().includes('micromessenger');
  const useMiniProgramLaunch = isExternalMobileBrowser();
  const [launching, setLaunching] = useState(false);

  const loginWithWeChat = () => {
    if (isWeChat) {
      http
        .get('/wechat/auth-url', {
          params: {
            ...(redirect ? { redirect } : {}),
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

  const button = (
    <Button
      variant="outline"
      onClick={useMiniProgramLaunch ? handleMiniProgramLaunch : loginWithWeChat}
      disabled={useMiniProgramLaunch && launching}
      aria-label={iconOnly ? label : undefined}
      className={
        iconOnly
          ? 'h-9 w-full px-0 [&_svg]:size-5 dark:[&_svg]:fill-white'
          : 'w-full [&_svg]:size-5 dark:[&_svg]:fill-white'
      }
    >
      <WeChatIcon />
      <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
    </Button>
  );

  if (!iconOnly) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
