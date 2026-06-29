import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { http } from '@/lib/request';
import { H5LaunchDialog } from '@/page/user/wechat/H5LaunchDialog';
import {
  isExternalMobileBrowser,
  launchWechatMiniProgram,
} from '@/page/user/wechat/launchMiniProgram';

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
      className="h-[30px] w-[71px] shrink-0 text-xs font-medium"
    >
      {children}
    </Button>
  );
}

export function WechatLogin(props: IProps) {
  const { onScan } = props;
  const { t } = useTranslation();
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
  const isWeChat = navigator.userAgent.toLowerCase().includes('micromessenger');
  const useMiniProgramLaunch = isExternalMobileBrowser();

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

  const handleLaunchConfirm = () => {
    setLaunchDialogOpen(false);
    launchWechatMiniProgram(() => {
      toast.error(t('login.wechat_h5_launch_failed'), {
        position: 'bottom-right',
      });
    });
  };

  if (useMiniProgramLaunch) {
    return (
      <>
        <ActionButton onClick={() => setLaunchDialogOpen(true)}>
          {t('setting.bind_btn')}
        </ActionButton>
        <H5LaunchDialog
          open={launchDialogOpen}
          onOpenChange={setLaunchDialogOpen}
          onConfirm={handleLaunchConfirm}
        />
      </>
    );
  }

  return (
    <ActionButton onClick={loginWithWeChat}>
      {t('setting.bind_btn')}
    </ActionButton>
  );
}
