import { toast } from 'sonner';
import WeChatIcon from './icon';
import isMobile from 'ismobilejs';
import { http } from '@/lib/request';
import { Button } from '@/components/button';
import { useTranslation } from 'react-i18next';

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
      http.get('/wechat/auth-url').then(authUrl => {
        location.href = authUrl;
      });
    } else {
      onScan(true);
    }
  };

  return (
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
    </div>
  );
}
