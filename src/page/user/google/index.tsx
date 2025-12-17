import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { GoogleIcon } from '@/assets/icons/google';
import { Button } from '@/components/button';
import { http } from '@/lib/request';

export default function Google() {
  const { t } = useTranslation();

  const loginWithGoogle = () => {
    http
      .get('/google/auth-url')
      .then(authUrl => {
        window.location.href = authUrl;
      })
      .catch(error => {
        toast.error(error.message, { position: 'bottom-right' });
      });
  };

  return (
    <Button
      variant="outline"
      onClick={loginWithGoogle}
      className="w-full [&_svg]:size-5 dark:[&_svg]:fill-white"
    >
      <GoogleIcon className="scale-90" />
      {t('login.login_use_google')}
    </Button>
  );
}
