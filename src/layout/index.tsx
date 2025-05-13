import { useEffect } from 'react';
import { http } from '@/lib/request';
import extension from '@/lib/extension';
import { Toaster } from '@/components/ui/sonner';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';

export default function Layout() {
  const loc = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const namespace_id = params.namespace_id;

  useEffect(() => {
    if (localStorage.getItem('uid')) {
      if (namespace_id) {
        return;
      }
      extension().then((val) => {
        if (val) {
          http.get('namespaces/user').then((data) => {
            if (Array.isArray(data) && data.length > 0) {
              navigate(`/${data[0].id}/chat`, { replace: true });
            }
          });
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
  }, [namespace_id, loc.pathname]);

  return (
    <>
      <Toaster />
      <Outlet />
    </>
  );
}
