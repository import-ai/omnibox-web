import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toDefaultNamespace } from '@/utils/namespace';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export default function Layout() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loc.pathname.startsWith('/user/')) {
      return;
    }
    if (localStorage.getItem('uid')) {
      toDefaultNamespace(navigate);
    } else {
      navigate('/user/login', {
        state: { from: loc },
        replace: true,
      });
    }
  }, [loc.pathname]);

  return (
    <>
      <Toaster />
      <Outlet />
    </>
  );
}
