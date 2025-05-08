import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Logout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('uid');
    localStorage.removeItem('token');
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
