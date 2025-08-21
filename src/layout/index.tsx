import axios from 'axios';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import { Toaster } from '@/components/ui/sonner';
import useTheme from '@/hooks/use-theme';
import { http } from '@/lib/request';

export default function Layout() {
  const loc = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { app, onToggleTheme } = useTheme();
  const namespace_id = params.namespace_id;
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const responseType = searchParams.get('response_type');

  useEffect(() => {
    if (localStorage.getItem('uid')) {
      if (clientId && redirectUri) {
        http
          .get(
            `/oauth2/authorize?response_type=${responseType}&client_id=${clientId}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`
          )
          .then(response => {
            location.href = response.redirect_url;
          });
        return;
      }
      if (namespace_id) {
        return;
      }
      if (
        !loc.pathname.startsWith('/invite/confirm') &&
        !loc.pathname.startsWith('/single')
      ) {
        http.get('namespaces').then(data => {
          if (Array.isArray(data) && data.length > 0) {
            navigate(`/${data[0].id}/chat`, { replace: true });
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
  }, [clientId, redirectUri, namespace_id, loc.pathname]);

  useEffect(() => {
    if (!localStorage.getItem('uid')) {
      return;
    }
    const source = axios.CancelToken.source();
    http
      .get('/user/option/language', { cancelToken: source.token })
      .then(response => {
        if (!response || !response.value) {
          return;
        }
        const lng = response.value === 'en-US' ? 'en' : 'zh';
        if (lng !== i18n.language) {
          i18n.changeLanguage(lng);
        }
      });
    http
      .get('/user/option/theme', { cancelToken: source.token })
      .then(response => {
        if (!response || !response.value) {
          return;
        }
        const cuttentTheme = app.getTheme();
        if (response.value !== cuttentTheme.skin) {
          onToggleTheme(response.value);
        }
      });
    const storageChangeFN = (event: StorageEvent) => {
      if (event.key === 'theme') {
        const themeInStorage = JSON.parse(event.newValue || '{}');
        onToggleTheme(themeInStorage.skin);
      } else if (event.key === 'i18nextLng') {
        event.newValue && i18n.changeLanguage(event.newValue);
      }
    };
    window.addEventListener('storage', storageChangeFN);
    return () => {
      window.removeEventListener('storage', storageChangeFN);
      source.cancel();
    };
  }, []);

  return (
    <>
      <Toaster />
      <Outlet />
    </>
  );
}
