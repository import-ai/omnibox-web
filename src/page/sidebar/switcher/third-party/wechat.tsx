import isMobile from 'ismobilejs';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
    <button
      onClick={onClick}
      className="flex h-[30px] w-[71px] shrink-0 items-center justify-center rounded-md bg-foreground text-sm font-semibold text-background hover:opacity-90"
    >
      {children}
    </button>
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
