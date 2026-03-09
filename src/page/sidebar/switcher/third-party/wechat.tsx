import isMobile from 'ismobilejs';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { http } from '@/lib/request';

interface IProps {
  onScan: (value: boolean) => void;
}

function ActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      variant="default"
      onClick={onClick}
      className="h-[30px] w-[71px] shrink-0 text-sm font-semibold hover:opacity-90"
    >
      {children}
    </Button>
  );
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
      <ActionButton onClick={alertDisableWeChatLogin}>
        {t('setting.bind_btn')}
      </ActionButton>
    );
  }

  return (
    <ActionButton onClick={loginWithWeChat}>
      {t('setting.bind_btn')}
    </ActionButton>
  );
}
