import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { initNamespace } from '@/lib/namespace';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { isBoolean } from 'lodash-es';

export default function Layout() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loc.pathname.startsWith('/user/')) {
      return;
    }
    if (localStorage.getItem('uid')) {
      initNamespace().then((returnValue) => {
        if (!isBoolean(returnValue)) {
          return;
        }
        if (returnValue) {
          navigate('/', { replace: true });
        } else {
          navigate('/user/login', { replace: true });
        }
      });
    } else {
      navigate(`/user/login?redirect=${encodeURIComponent(location.href)}`, {
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
