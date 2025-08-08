import { toast } from 'sonner';
import isMobile from 'ismobilejs';
import { http } from '@/lib/request';
import { Link } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from 'react-i18next';

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
      <Button size="sm" variant="outline" onClick={alertDisableWeChatLogin}>
        <Link className="size-4 mr-2" />
        绑定
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={loginWithWeChat}>
      <Link className="size-4 mr-2" />
      绑定
    </Button>
  );
}
