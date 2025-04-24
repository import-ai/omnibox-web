import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Logout() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('uid');
    localStorage.removeItem('token');
    localStorage.removeItem('namespace');
    navigate('/user/login', { replace: true });
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleLogout}
      className="w-full justify-start text-muted-foreground"
    >
      Logout
    </Button>
  );
}
