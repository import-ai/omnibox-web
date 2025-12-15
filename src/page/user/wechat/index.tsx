import isMobile from 'ismobilejs';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { WeChatIcon } from '@/assets/icons/wechatIcon';
import { Button } from '@/components/button';
import { http } from '@/lib/request';

interface IProps {
  onScan: (value: boolean) => void;
}

export default function WeChat(props: IProps) {
  const { onScan } = props;
  const { t } = useTranslation();
  const userAgent = navigator.userAgent.toLowerCase();
  const isPhone = isMobile(userAgent).phone;
  const isWeChat = userAgent.includes('micromessenger');
  const alertDisableWeChatLogin = () => {
    toast(t('login.wechat_disabled'), { position: 'bottom-right' });
  };
  const loginWithWeChat = () => {
    if (isWeChat) {
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

  if (isPhone && !isWeChat) {
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
