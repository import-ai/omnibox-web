import axios from 'axios';
import { useEffect, useState } from 'react';
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
  const namespaceId = params.namespace_id;
  const shareId = params.share_id;
  const [uid, setUid] = useState(localStorage.getItem('uid'));

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'i18nextLng') {
        const lang = event.newValue;
        if (lang && lang !== i18n.language) {
          i18n.changeLanguage(lang);
        }
      } else if (event.key === 'theme') {
        const themeInStorage = JSON.parse(event.newValue || '{}');
        onToggleTheme(themeInStorage.skin);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const storedUid = localStorage.getItem('uid');
    if (storedUid !== uid) {
      setUid(storedUid);
    }
  }, [loc]);

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
    // Be compatible with extension login
    if (loc.search === '?from=extension' && uid) {
      localStorage.removeItem('uid');
      localStorage.removeItem('token');
      return;
    }

    const requireLogin = () => {
      if (!uid) {
        if (namespaceId) {
          return true;
        }
        if (loc.pathname.startsWith('/invite')) {
          return true;
        }
        if (loc.pathname === '/') {
          return true;
        }
      }
      return false;
    };

    if (requireLogin()) {
      navigate(`/user/login?redirect=${encodeURIComponent(location.href)}`, {
        replace: true,
      });
      return;
    }

    if (loc.pathname === '/') {
      http.get('namespaces').then(data => {
        if (Array.isArray(data) && data.length > 0) {
          navigate(`/${data[0].id}/chat`, { replace: true });
        }
      });
    }
  }, [namespaceId, shareId, uid, loc]);

  useEffect(() => {
    if (!uid) {
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
        const theme = response?.value;
        if (theme && theme !== app.getTheme().skin) {
          onToggleTheme(theme);
        }
      });
    return () => source.cancel();
  }, [uid]);

  return (
    <>
      <Toaster />
      <Outlet />
    </>
  );
}
