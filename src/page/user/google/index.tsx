import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { GoogleIcon } from '@/assets/icons/google';
import { Button } from '@/components/button';
import { http } from '@/lib/request';

interface IProps {
  mode?: 'login' | 'register';
}

export default function Google(props: IProps) {
  const { mode = 'login' } = props;
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');

  const loginWithGoogle = () => {
    http
      .get('/google/auth-url', {
        params: redirect ? { redirect } : undefined,
      })
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
      <GoogleIcon />
      {t(
        mode === 'register'
          ? 'register.register_use_google'
          : 'login.login_use_google'
      )}
    </Button>
  );
}
