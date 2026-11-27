import axios from 'axios';
import { Suspense, useEffect, useRef, useState } from 'react';
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
import { useBehaviorSurface } from '@/lib/behaviorTracking';
import { resolveColorTheme } from '@/lib/colorThemes';
import {
  getPendingDocsAppearance,
  persistDocsAppearance,
} from '@/lib/docsAppearance';
import { resolveFont } from '@/lib/fonts';
import { http } from '@/lib/request';
import { track } from '@/lib/sendTrackEvent';
import { useChatStore } from '@/page/chat/chatStore';
import { clearConversationCache } from '@/page/chat/conversation/conversationCache';
import { useCopilotStore } from '@/page/copilot/copilotStore';
import {
  consumeInviteReferralLanding,
  getStoredInviteRegistration,
  isValidInviteCode,
  markInviteReferralLanding,
  retryPendingInviteRegistration,
} from '@/page/inviteReferral/registration';
import { useResourceStore } from '@/page/resource/resourceStore';
import { useSidebarStore } from '@/page/sidebar/store';
import { getAuthSuccessRedirect } from '@/page/user/authRedirect';
import { establishServerSession, readSessionUser } from '@/page/user/session';
import { useAuthPageExposure } from '@/page/user/useAuthPageExposure';
import {
  CREDENTIAL_CHANGED_EVENT,
  removeGlobalCredential,
} from '@/page/user/util';

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
  const isOAuthAuthorization = loc.pathname === '/oauth/authorize';
  useBehaviorSurface({ scope: 'global', target: 'app', exposure: false });
  const params = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { app, onToggleTheme } = useTheme();
  const namespaceId = params.namespace_id;
  const shareId = params.share_id;
  const path = loc.pathname.replace(/\/+$/, '').toLowerCase();
  const searchParams = new URLSearchParams(loc.search);
  const isInviteAuth =
    isValidInviteCode(searchParams.get('invite_code') ?? '') &&
    ['/user/sign-up', '/user/verify-otp', '/user/login'].includes(path);
  const inviteLoginRedirect =
    isInviteAuth && path === '/user/login'
      ? searchParams.get('redirect')
      : null;
  const callbackInvite =
    path === '/user/auth/confirm' || path === '/user/auth/confirm/google'
      ? getStoredInviteRegistration()
      : null;
  const isInviteCallback =
    callbackInvite?.source === 'link' && isValidInviteCode(callbackInvite.code);
  const [storedUid, setUid] = useState(localStorage.getItem('uid'));
  // An unverified local uid must not start authenticated requests while an
  // invite visitor is registering or verifying their one-time code.
  const uid = isInviteAuth || isInviteCallback ? null : storedUid;
  const [inviteSessionChecked, setInviteSessionChecked] = useState(false);
  // The root path is served only to a browser the gateway considers signed
  // in, so the cookie is the source of truth once local storage is empty.
  const [sessionChecked, setSessionChecked] = useState(() =>
    Boolean(localStorage.getItem('uid'))
  );
  const sessionAbortRef = useRef<AbortController | null>(null);
  const sessionBootstrappedRef = useRef(false);
  const authEpochRef = useRef(0);
  const isMobile = useIsMobile();
  const { config, loading: configLoading } = useConfig();

  useAuthPageExposure(
    loc.pathname,
    isInviteAuth ? inviteSessionChecked : sessionChecked && !uid,
    isInviteAuth
  );

  useEffect(() => {
    // Embedded OAuth may only have a cookie scoped to the authorize endpoint.
    // Do not widen it or hydrate unrelated account data on this public route.
    if (isOAuthAuthorization) return;
    if (!isInviteAuth) setInviteSessionChecked(false);
    if (isInviteCallback || (!isInviteAuth && sessionBootstrappedRef.current)) {
      return;
    }
    let active = true;
    const controller = new AbortController();
    sessionAbortRef.current = controller;
    const uidAtStart = localStorage.getItem('uid');
    const tokenAtStart = localStorage.getItem('token');
    const epochAtStart = authEpochRef.current;

    // A response that arrives after the credentials changed belongs to the
    // previous account and must not overwrite the newer state.
    const isStillCurrent = () =>
      active &&
      !controller.signal.aborted &&
      authEpochRef.current === epochAtStart &&
      localStorage.getItem('uid') === uidAtStart &&
      localStorage.getItem('token') === tokenAtStart;

    let redirectingInvite = false;
    const inviteTimeout = isInviteAuth
      ? window.setTimeout(() => {
          if (!isStillCurrent()) return;
          controller.abort();
          setInviteSessionChecked(true);
          setSessionChecked(true);
        }, 3_000)
      : undefined;

    // Ordinary routes refresh older cookies. The invite entry must first
    // verify the account without reissuing a cookie from local credentials.
    const sessionRequest = isInviteAuth
      ? readSessionUser(controller.signal)
      : establishServerSession(controller.signal);
    void sessionRequest
      .then(async sessionUid => {
        if (!isStillCurrent() || !sessionUid) return;
        const target = inviteLoginRedirect
          ? await getAuthSuccessRedirect(inviteLoginRedirect)
          : '/';
        if (!isStillCurrent()) return;
        sessionBootstrappedRef.current = true;
        if (isInviteAuth && uidAtStart !== sessionUid) {
          if (uidAtStart) clearUserWorkspaceState();
          // The verified cookie belongs to a different account. Do not let
          // the previous bearer replace it on a subsequent ordinary visit.
          localStorage.removeItem('token');
        }
        localStorage.setItem('uid', sessionUid);
        setUid(sessionUid);
        setSessionChecked(true);
        if (isInviteAuth) {
          redirectingInvite = true;
          navigate(target, { replace: true });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(inviteTimeout);
        if (active && !controller.signal.aborted) {
          if (isInviteAuth) {
            if (!redirectingInvite) setInviteSessionChecked(true);
          } else {
            sessionBootstrappedRef.current = true;
          }
          setSessionChecked(true);
        }
        if (sessionAbortRef.current === controller) {
          sessionAbortRef.current = null;
        }
      });

    return () => {
      active = false;
      window.clearTimeout(inviteTimeout);
      controller.abort();
    };
  }, [
    inviteLoginRedirect,
    isInviteAuth,
    isInviteCallback,
    isOAuthAuthorization,
    navigate,
  ]);

  useEffect(() => {
    // Signing out in this tab only fires the credential event: the browser
    // never sends a `storage` event to the tab that changed local storage. A
    // session refresh still in flight would reissue the cookie the logout just
    // cleared, so any credential change has to cancel it.
    const handleCredentialChange = () => {
      authEpochRef.current += 1;
      sessionAbortRef.current?.abort();
      sessionAbortRef.current = null;
      const currentUid = localStorage.getItem('uid');
      if (currentUid !== storedUid) {
        clearUserWorkspaceState();
      }
      setUid(currentUid);
      setSessionChecked(true);
      const redirectPath = getAuthChangeRedirectPath(
        window.location.pathname,
        storedUid,
        currentUid
      );
      if (isInviteAuth) setInviteSessionChecked(!redirectPath);
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'i18nextLng') {
        const lang = event.newValue;
        if (lang && lang !== i18n.language) {
          i18n.changeLanguage(lang);
        }
      } else if (event.key === 'theme') {
        try {
          const themeInStorage = JSON.parse(event.newValue || '{}');
          if (
            event.newValue !== null &&
            !['light', 'dark', 'system'].includes(themeInStorage?.skin)
          ) {
            return;
          }
          onToggleTheme(
            themeInStorage?.skin ?? 'system',
            resolveColorTheme(themeInStorage?.colorTheme),
            resolveFont(themeInStorage?.font)
          );
          if (!isOAuthAuthorization) {
            void persistDocsAppearance(uid).catch(() => undefined);
          }
        } catch {
          // Ignore malformed preferences from other tabs.
        }
      } else if (isAuthStorageKey(event.key)) {
        handleCredentialChange();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    const retryDocsAppearance = () => {
      if (!isOAuthAuthorization) {
        void persistDocsAppearance(uid).catch(() => undefined);
      }
    };
    window.addEventListener('focus', retryDocsAppearance);
    window.addEventListener(CREDENTIAL_CHANGED_EVENT, handleCredentialChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', retryDocsAppearance);
      window.removeEventListener(
        CREDENTIAL_CHANGED_EVENT,
        handleCredentialChange
      );
    };
  }, [
    i18n,
    isInviteAuth,
    isOAuthAuthorization,
    navigate,
    onToggleTheme,
    storedUid,
    uid,
  ]);

  useEffect(() => {
    const currentUid = localStorage.getItem('uid');
    if (currentUid !== storedUid) {
      clearUserWorkspaceState();
      setUid(currentUid);
    }
  }, [loc]);

  useEffect(() => {
    if (!uid || isOAuthAuthorization) {
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
  }, [uid, isOAuthAuthorization]);

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
    const syncUserOptions =
      !isOAuthAuthorization && shouldSyncUserOptions(uid, shareId);

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
    const pendingAtStart = getPendingDocsAppearance(uid);
    const themeAtStart = localStorage.getItem('theme');
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
        const pending = getPendingDocsAppearance(uid) ?? pendingAtStart;
        const skin =
          localStorage.getItem('theme') !== themeAtStart
            ? app.getTheme().skin
            : pending?.mode || themeValue?.value || app.getTheme().skin;
        const colorTheme = resolveColorTheme(colorThemeValue?.value);
        if (
          skin !== app.getTheme().skin ||
          colorTheme !== app.getTheme().colorTheme ||
          font !== app.getTheme().font
        ) {
          onToggleTheme(skin, colorTheme, font);
        }
        void persistDocsAppearance(uid).catch(() => undefined);
      });

    return () => source.cancel();
  }, [loc.search, isOAuthAuthorization, uid, shareId, i18n]);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <Toaster />
      <Suspense fallback={<Loading />}>
        {isInviteAuth && !inviteSessionChecked ? <Loading /> : <Outlet />}
      </Suspense>
    </DndProvider>
  );
}
