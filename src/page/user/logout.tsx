import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/button';
import { http } from '@/lib/request';
import { removeGlobalCredential } from '@/page/user/util';

export function Logout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, onLoading] = useState(false);
  const handleLogout = () => {
    onLoading(true);
    http
      .post('logout')
      .then(() => {
        removeGlobalCredential();
        document.body.style.pointerEvents = '';
        navigate('/user/login', { replace: true });
      })
      .catch(() => {
        onLoading(false);
      });
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      loading={loading}
      onClick={handleLogout}
      className="w-full justify-start text-muted-foreground"
    >
      {t('login.logout')}
    </Button>
  );
}
