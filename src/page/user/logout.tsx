import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { removeGlobalCredential } from '@/page/user/util';

export function Logout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleLogout = () => {
    removeGlobalCredential();
    document.body.style.pointerEvents = '';
    navigate('/user/login', { replace: true });
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleLogout}
      className="w-full justify-start text-muted-foreground"
    >
      {t('login.logout')}
    </Button>
  );
}
