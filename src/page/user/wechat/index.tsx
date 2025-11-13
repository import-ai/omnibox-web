import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { useDevice } from '@/hooks/use-device';
import { http } from '@/lib/request';

import { WeChatIcon } from './icon';

interface IProps {
  onScan: (value: boolean) => void;
}

export default function WeChat(props: IProps) {
  const { onScan } = props;
  const { t } = useTranslation();
  const { mobile, wechat } = useDevice();
  const alertDisableWeChatLogin = () => {
    toast(t('login.wechat_disabled'), { position: 'bottom-right' });
  };
  const loginWithWeChat = () => {
    if (wechat) {
      http
        .get('/wechat/auth-url')
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

  if (mobile && !wechat) {
    return (
      <Button
        variant="outline"
        onClick={alertDisableWeChatLogin}
        className="w-full [&_svg]:size-5 dark:[&_svg]:fill-white opacity-50"
      >
        <WeChatIcon />
        {t('login.login_use_wechat')}
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
      {t('login.login_use_wechat')}
    </Button>
  );
}
