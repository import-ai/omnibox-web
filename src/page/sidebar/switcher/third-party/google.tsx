import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
    <Button
      variant="default"
      onClick={loginWithGoogle}
      className="h-[30px] w-[71px] shrink-0 text-sm font-semibold hover:opacity-90"
    >
      {t('setting.bind_btn')}
    </Button>
  );
}
