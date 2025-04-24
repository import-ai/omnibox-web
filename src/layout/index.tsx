import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toDefaultNamespace } from '@/utils/namespace';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      [
        '/user/login',
        '/user/invite',
        '/user/register',
        '/user/password',
        '/user/password-comfirm',
        '/user/register-comfirm',
      ].includes(location.pathname)
    ) {
      return;
    }
    if (localStorage.getItem('uid')) {
      toDefaultNamespace(navigate);
    } else {
      navigate('/user/login', { state: { from: location }, replace: true });
    }
  }, [location.pathname]);

  return (
    <>
      <Toaster />
      <Outlet />
    </>
  );
}
