import isMobile from 'ismobilejs';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { SettingPageButton } from '@/components/omnibox/SettingPageButton';
import { http } from '@/lib/request';

interface IProps {
  onScan: (value: boolean) => void;
}

export function WechatLogin(props: IProps) {
  const { onScan } = props;
  const { t } = useTranslation();
  const userAgent = navigator.userAgent.toLowerCase();
  const isPhone = isMobile(userAgent).phone;
  const isWeChat = userAgent.includes('micromessenger');

  const alertDisableWeChatLogin = () => {
    toast.warning(t('login.wechat_disabled'), { position: 'bottom-right' });
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
      <SettingPageButton onClick={alertDisableWeChatLogin}>
        {t('setting.bind_btn')}
      </SettingPageButton>
    );
  }

  return (
    <SettingPageButton onClick={loginWithWeChat}>
      {t('setting.bind_btn')}
    </SettingPageButton>
  );
}
