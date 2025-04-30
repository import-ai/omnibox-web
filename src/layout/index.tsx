import { useEffect } from 'react';
import extension from '@/lib/extension';
import { initNamespace } from '@/lib/namespace';
import { Toaster } from '@/components/ui/sonner';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { isBoolean } from 'lodash-es';

export default function Layout() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('uid')) {
      initNamespace().then((returnValue) => {
        if (!isBoolean(returnValue)) {
          if (loc.pathname.startsWith('/user/')) {
            extension().then((val) => {
              if (val) {
                navigate('/', { replace: true });
              }
            });
          }
          return;
        }
        if (returnValue) {
          navigate('/', { replace: true });
        } else {
          navigate('/user/login', { replace: true });
        }
      });
    } else {
      if (loc.pathname.startsWith('/user/')) {
        return;
      }
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
