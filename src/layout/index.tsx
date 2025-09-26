import axios from 'axios';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Toaster } from '@/components/ui/sonner';
import useTheme from '@/hooks/use-theme';
import { http } from '@/lib/request';
import { track } from '@/lib/send-track-event';

export default function Layout() {
  const loc = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { app, onToggleTheme } = useTheme();
  const namespace_id = params.namespace_id;
  const share_id = params.share_id;

  useEffect(() => {
    const referrer = document.referrer;
    if (!referrer || referrer.includes(location.hostname)) {
      return;
    }
    track('visit_web_from', {
      referrer,
      url: location.href,
      language: i18n.language,
    });
  }, []);

  useEffect(() => {
    if (share_id) {
      return;
    }
    if (localStorage.getItem('uid')) {
      // Compatible with extension login
      if (location.search === '?from=extension') {
        localStorage.removeItem('uid');
        localStorage.removeItem('token');
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
  }, [namespace_id, loc.pathname]);

  useEffect(() => {
    if (!localStorage.getItem('uid')) {
      return;
    }
    const source = axios.CancelToken.source();
    http
      .get('/user/option/language', { cancelToken: source.token })
      .then(response => {
        const lang = response?.value;
        if (lang && lang !== i18n.language) {
          i18n.changeLanguage(lang);
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
