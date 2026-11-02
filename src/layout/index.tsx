import axios from 'axios';
import { Suspense, useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import Loading from '@/components/loading';
import { Toaster } from '@/components/ui/Toaster';
import useConfig from '@/hooks/useConfig';
import { useIsMobile } from '@/hooks/useMobile';
import useTheme from '@/hooks/useTheme';
import { resolveColorTheme } from '@/lib/colorThemes';
import { resolveFont } from '@/lib/fonts';
import { http } from '@/lib/request';
import { track } from '@/lib/sendTrackEvent';
import { useChatStore } from '@/page/chat/chatStore';
import { clearConversationCache } from '@/page/chat/conversation/conversationCache';
import { useCopilotStore } from '@/page/copilot/copilotStore';
import {
  consumeInviteReferralLanding,
  markInviteReferralLanding,
  retryPendingInviteRegistration,
} from '@/page/inviteReferral/registration';
import { useResourceStore } from '@/page/resource/resourceStore';
import { useSidebarStore } from '@/page/sidebar/store';
import { establishServerSession } from '@/page/user/session';
import { removeGlobalCredential } from '@/page/user/util';

import {
  getAuthChangeRedirectPath,
  isAuthStorageKey,
  shouldSyncUserOptions,
} from './authStorage';
import { LAST_NAMESPACE_ID_KEY, resolveRootDestination } from './rootRedirect';

function clearUserWorkspaceState() {
  clearConversationCache();
  useResourceStore.getState().resetFeaturePreviews();
  useChatStore.getState().clearContext();
  useSidebarStore.getState().clear();
  useCopilotStore.getState().clearAll();
}

export default function Layout() {
  const loc = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { app, onToggleTheme } = useTheme();
  const namespaceId = params.namespace_id;
  const shareId = params.share_id;
  const [uid, setUid] = useState(localStorage.getItem('uid'));
  // The root path is served only to a browser the gateway considers signed
  // in, so the cookie is the source of truth once local storage is empty.
  const [sessionChecked, setSessionChecked] = useState(() =>
    Boolean(localStorage.getItem('uid'))
  );
  const isMobile = useIsMobile();
  const { config, loading: configLoading } = useConfig();

  useEffect(() => {
    let active = true;
    // Refreshes the cookie so one written with an older SameSite policy is
    // replaced, and restores the signed-in user when local storage is empty.
    void establishServerSession()
      .then(sessionUid => {
        if (!active) return;
        localStorage.setItem('uid', sessionUid);
        setUid(sessionUid);
        setSessionChecked(true);
      })
      .catch(() => {
        if (active) setSessionChecked(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'i18nextLng') {
        const lang = event.newValue;
        if (lang && lang !== i18n.language) {
          i18n.changeLanguage(lang);
        }
      } else if (event.key === 'theme') {
        try {
          const themeInStorage = JSON.parse(event.newValue || '{}');
          onToggleTheme(
            themeInStorage?.skin ?? 'system',
            resolveColorTheme(themeInStorage?.colorTheme),
            resolveFont(themeInStorage?.font)
          );
        } catch {
          // Ignore malformed preferences from other tabs.
        }
      } else if (isAuthStorageKey(event.key)) {
        const storedUid = localStorage.getItem('uid');
        if (storedUid !== uid) {
          clearUserWorkspaceState();
        }
        setUid(storedUid);
        const redirectPath = getAuthChangeRedirectPath(
          window.location.pathname,
          uid,
          storedUid
        );
        if (redirectPath) {
          navigate(redirectPath, { replace: true });
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [i18n, navigate, onToggleTheme, uid]);

  useEffect(() => {
    const storedUid = localStorage.getItem('uid');
    if (storedUid !== uid) {
      clearUserWorkspaceState();
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
    void retryPendingInviteRegistration(uid).then(result => {
      if (!result) return;
      markInviteReferralLanding(result.requires_phone_binding);
      if (location.pathname !== '/oauth/authorize') location.href = '/';
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
      searchParams.get('from') === 'extension_login' &&
      uid
    ) {
      removeGlobalCredential();
      return;
    }

    const requireLogin = () => {
      if (!sessionChecked) {
        return false;
      }
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

    if (!uid || loc.pathname !== '/' || configLoading) {
      return;
    }

    let active = true;
    const endpoint = config.commercial ? 'pro-namespaces' : 'namespaces';
    http
      .get(endpoint)
      .then(namespaces => {
        if (!active) return;
        const destination = resolveRootDestination(
          Array.isArray(namespaces) ? namespaces : [],
          {
            inviteLanding: consumeInviteReferralLanding(),
            lastNamespaceId: localStorage.getItem(LAST_NAMESPACE_ID_KEY),
          }
        );
        navigate(destination, { replace: true });
      })
      .catch(() => {
        if (active) navigate('/welcome', { replace: true });
      });

    return () => {
      active = false;
    };
  }, [
    config.commercial,
    configLoading,
    namespaceId,
    sessionChecked,
    shareId,
    uid,
    loc,
  ]);

  useEffect(() => {
    if (namespaceId && !shareId) {
      localStorage.setItem(LAST_NAMESPACE_ID_KEY, namespaceId);
    }
  }, [namespaceId, shareId]);

  useEffect(() => {
    const searchParams = new URLSearchParams(loc.search);
    const langParam = searchParams.get('lang');
    const syncUserOptions = shouldSyncUserOptions(uid, shareId);

    if (langParam) {
      const lang = langParam.includes('en') ? 'en-US' : 'zh-CN';
      if (lang !== i18n.language) {
        i18n.changeLanguage(lang).then(() => {
          if (syncUserOptions) {
            http.post('/user/option', {
              name: 'language',
              value: lang,
            });
          }
        });
      }
    }

    if (!syncUserOptions) {
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
        const colorThemeValue = response.find(
          item => item.name === 'color_theme'
        );
        const fontValue = response.find(item => item.name === 'font');
        const font = resolveFont(fontValue?.value);
        const skin = themeValue?.value || app.getTheme().skin;
        const colorTheme = resolveColorTheme(colorThemeValue?.value);
        if (
          skin !== app.getTheme().skin ||
          colorTheme !== app.getTheme().colorTheme ||
          font !== app.getTheme().font
        ) {
          onToggleTheme(skin, colorTheme, font);
        }
      });

    return () => source.cancel();
  }, [loc.search, uid, shareId, i18n]);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <Toaster />
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </DndProvider>
  );
}
