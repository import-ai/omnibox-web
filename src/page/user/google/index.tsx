import { toast } from 'sonner';
import GoogleIcon from './icon';
import { http } from '@/lib/request';
import { Button } from '@/components/button';
import { useTranslation } from 'react-i18next';

export default function Google() {
  const { t } = useTranslation();

  const loginWithGoogle = () => {
    http
      .get('/google/auth-url')
      .then((authUrl) => {
        // 重定向到 Google OAuth 授权页面
        window.location.href = authUrl;
      })
      .catch((error) => {
        toast.error(error.message, { position: 'bottom-right' });
      });
  };

  return (
    <Button
      variant="outline"
      onClick={loginWithGoogle}
      className="w-full [&_svg]:size-4 dark:[&_svg]:fill-white"
    >
      <GoogleIcon />
      {t('login.login_use_google')}
    </Button>
  );
}
