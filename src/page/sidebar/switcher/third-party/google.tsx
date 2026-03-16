import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { http } from '@/lib/request';

export function GoogleLogin() {
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
    <Button variant="bind" onClick={loginWithGoogle}>
      {t('setting.bind_btn')}
    </Button>
  );
}
