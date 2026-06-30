import { useEffect, useRef } from 'react';

import { BIND_CHECK_INTERVAL } from '@/const';
import { http } from '@/lib/request';
import { getAuthSuccessRedirect } from '@/page/user/authRedirect';
import { setGlobalCredential } from '@/page/user/util';

import { isExternalMobileBrowser } from './launchMiniProgram';

const H5_WECHAT_OAUTH_POLL_KEY = 'h5_wechat_oauth_poll';
const H5_WECHAT_POLL_TIMEOUT_MS = 5 * 60 * 1000;

interface H5WechatOAuthPollSession {
  state: string;
  redirect: string | null;
  startedAt: number;
}

interface WechatCheckResponse {
  status: 'pending' | 'success' | 'expired';
  user?: {
    id: string;
    access_token: string;
  };
}

export function parseOAuthStateFromAuthUrl(authUrl: string): string | null {
  try {
    const normalized = authUrl.split('#')[0];
    return new URL(normalized).searchParams.get('state');
  } catch {
    return null;
  }
}

export function getH5WechatLoginParams(
  params: URLSearchParams
): Record<string, string> {
  const extra: Record<string, string> = {};
  const oauthState = params.get('oauth_state');
  const from = params.get('from');

  if (oauthState) {
    extra.oauth_state = oauthState;
  }
  if (from) {
    extra.from = from;
  }

  return extra;
}

export function persistH5WechatOAuthPoll(
  state: string,
  redirect?: string | null
): void {
  const session: H5WechatOAuthPollSession = {
    state,
    redirect: redirect ?? null,
    startedAt: Date.now(),
  };
  sessionStorage.setItem(H5_WECHAT_OAUTH_POLL_KEY, JSON.stringify(session));
}

export function clearH5WechatOAuthPoll(): void {
  sessionStorage.removeItem(H5_WECHAT_OAUTH_POLL_KEY);
}

export async function syncH5WechatOAuthState(
  oauthState: string | null,
  userId: string,
  accessToken: string
): Promise<void> {
  if (!oauthState) {
    return;
  }

  await http.post(
    '/wechat/check/complete',
    {
      state: oauthState,
      id: userId,
      access_token: accessToken,
    },
    { mute: true }
  );
}

async function pollH5WechatOAuthOnce(
  session: H5WechatOAuthPollSession
): Promise<boolean> {
  if (Date.now() - session.startedAt > H5_WECHAT_POLL_TIMEOUT_MS) {
    clearH5WechatOAuthPoll();
    return true;
  }

  const response = (await http.get('/wechat/check', {
    params: { state: session.state },
    mute: true,
  })) as WechatCheckResponse;

  if (response.status === 'expired') {
    clearH5WechatOAuthPoll();
    return true;
  }

  if (response.status === 'success' && response.user) {
    clearH5WechatOAuthPoll();
    setGlobalCredential(response.user.id, response.user.access_token);
    location.href = await getAuthSuccessRedirect(session.redirect);
    return true;
  }

  return false;
}

function getPersistedH5WechatOAuthPoll(): H5WechatOAuthPollSession | null {
  const raw = sessionStorage.getItem(H5_WECHAT_OAUTH_POLL_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as H5WechatOAuthPollSession;
    if (!session.state) {
      clearH5WechatOAuthPoll();
      return null;
    }
    return session;
  } catch {
    clearH5WechatOAuthPoll();
    return null;
  }
}

export function useH5WechatAuthPoll(): void {
  const pollingRef = useRef(false);

  useEffect(() => {
    if (!isExternalMobileBrowser()) {
      return;
    }

    const poll = async () => {
      if (pollingRef.current) {
        return;
      }

      const session = getPersistedH5WechatOAuthPoll();
      if (!session) {
        return;
      }

      pollingRef.current = true;
      try {
        await pollH5WechatOAuthOnce(session);
      } finally {
        pollingRef.current = false;
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, BIND_CHECK_INTERVAL);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void poll();
      }
    };

    const handleResume = () => {
      void poll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
    };
  }, []);
}

export async function prepareH5WechatOAuthState(
  redirect?: string | null
): Promise<string> {
  const authUrl = (await http.get('/wechat/auth-url', {
    params: {
      source: 'h5',
      ...(redirect ? { redirect } : {}),
    },
  })) as string;

  const state = parseOAuthStateFromAuthUrl(authUrl);
  if (!state) {
    throw new Error('Invalid WeChat auth URL');
  }

  persistH5WechatOAuthPoll(state, redirect);
  return state;
}
