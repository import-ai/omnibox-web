import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { SettingPageButton } from '@/components/omnibox/SettingPageButton';
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
    <SettingPageButton onClick={loginWithGoogle}>
      {t('setting.bind_btn')}
    </SettingPageButton>
  );
}
