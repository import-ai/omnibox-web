import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
    <button
      onClick={loginWithGoogle}
      className="flex h-[30px] w-[71px] shrink-0 items-center justify-center rounded-md bg-foreground text-sm font-semibold text-background hover:opacity-90"
    >
      {t('setting.bind_btn')}
    </button>
  );
}
