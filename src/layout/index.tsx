import { useEffect } from 'react';
import { http } from '@/lib/request';
import extension from '@/lib/extension';
import useTheme from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/sonner';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';

export default function Layout() {
  const loc = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { app, onToggleTheme } = useTheme();
  const namespace_id = params.namespace_id;

  useEffect(() => {
    if (localStorage.getItem('uid')) {
      if (namespace_id) {
        return;
      }
      if (
        !loc.pathname.startsWith('/invite/confirm') &&
        !loc.pathname.startsWith('/single')
      ) {
        extension().then((val) => {
          if (val) {
            http.get('namespaces').then((data) => {
              if (Array.isArray(data) && data.length > 0) {
                navigate(`/${data[0].id}/chat`, { replace: true });
              }
            });
          }
        });
      }
    } else {
      if (
        loc.pathname.startsWith('/user/') ||
        loc.pathname.startsWith('/single')
      ) {
        return;
      }
      navigate(`/user/login?redirect=${encodeURIComponent(location.href)}`, {
        replace: true,
      });
    }
  }, [namespace_id, loc.pathname]);

  useEffect(() => {
    if (!localStorage.getItem('uid')) {
      return;
    }
    http.get('/user/option/language').then((response) => {
      if (!response || !response.value) {
        return;
      }
      const lng = response.value === 'en-US' ? 'en' : 'zh';
      if (lng !== i18n.language) {
        i18n.changeLanguage(lng);
      }
    });
    http.get('/user/option/theme').then((response) => {
      if (!response || !response.value) {
        return;
      }
      const cuttentTheme = app.getTheme();
      if (response.value !== cuttentTheme.skin) {
        onToggleTheme(response.value);
      }
    });
  }, []);

  return (
    <>
      <Toaster />
      <Outlet />
    </>
  );
}
