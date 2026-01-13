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
    if (!uid) {
      return;
    }
    track('related_relationships', {
      once: true,
      userId: uid,
    });

    // Handle extension login - signal extension to close the tab
    const loginFromExtension = localStorage.getItem('extension_login');
    if (loginFromExtension === 'true') {
      localStorage.removeItem('extension_login');
      document.body.classList.add('please_close_me');
    }
  }, [uid]);

  useEffect(() => {
    // Be compatible with extension login - only on login page
    const searchParams = new URLSearchParams(loc.search);
    if (
      loc.pathname === '/user/login' &&
      searchParams.get('from') === 'extension' &&
      uid
    ) {
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
        } else {
          navigate('/welcome', { replace: true });
        }
      });
    }
  }, [namespaceId, shareId, uid, loc]);

  useEffect(() => {
    const searchParams = new URLSearchParams(loc.search);
    const langParam = searchParams.get('lang');

    if (langParam) {
      const lang = langParam.includes('en') ? 'en-US' : 'zh-CN';
      if (lang !== i18n.language) {
        i18n.changeLanguage(lang).then(() => {
          if (uid) {
            http.post('/user/option', {
              name: 'language',
              value: lang,
            });
          }
        });
      }
    }

    if (!uid) {
      return;
    }

    const source = axios.CancelToken.source();
    http
      .get('/user/option/list', { cancelToken: source.token })
      .then((response: Array<{ name: string; value: any }>) => {
        if (!Array.isArray(response)) {
          return;
        }
        if (!langParam) {
          const languageItem = response.find(item => item.name === 'language');
          if (languageItem) {
            const lang = languageItem.value;
            if (lang && lang !== i18n.language) {
              i18n.changeLanguage(lang);
            }
          }
        }
        const themeValue = response.find(item => item.name === 'theme');
        if (themeValue) {
          const theme = themeValue.value;
          if (theme && theme !== app.getTheme().skin) {
            onToggleTheme(theme);
          }
        }
      });

    return () => source.cancel();
  }, [loc.search, uid, i18n]);

  return (
    <>
      <Toaster />
      <Outlet />
    </>
  );
}
