import Cookies from 'js-cookie';

import { clearConversationCache } from '@/page/chat/conversation/conversationCache';

const CREDENTIAL_CHANGED = 'omnibox:credential-changed';

export function subscribeCredentials(
  listener: (credential: { userId: string; token: string } | null) => void
) {
  const notify = () => {
    const userId = localStorage.getItem('uid');
    const token = localStorage.getItem('token');
    listener(userId && token ? { userId, token } : null);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === 'uid' || event.key === 'token') {
      notify();
    }
  };
  window.addEventListener(CREDENTIAL_CHANGED, notify);
  window.addEventListener('storage', onStorage);
  notify();
  return () => {
    window.removeEventListener(CREDENTIAL_CHANGED, notify);
    window.removeEventListener('storage', onStorage);
  };
}

export function setGlobalCredential(userId: string, token: string) {
  const previousUserId = localStorage.getItem('uid');
  if (previousUserId !== userId) {
    clearConversationCache();
  }
  localStorage.setItem('uid', userId);
  localStorage.setItem('token', token);
  let jwtExpiration: Date;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    jwtExpiration = new Date(payload.exp * 1000);
  } catch {
    jwtExpiration = new Date();
    jwtExpiration.setTime(jwtExpiration.getTime() + 24 * 60 * 60 * 1000);
  }
  const isSecure = location.protocol === 'https:';
  Cookies.set('token', token, {
    path: '/',
    secure: isSecure,
    sameSite: 'strict',
    expires: jwtExpiration,
  });
  window.dispatchEvent(new Event(CREDENTIAL_CHANGED));
}

export function removeGlobalCredential() {
  clearConversationCache();
  localStorage.removeItem('uid');
  localStorage.removeItem('token');
  Cookies.remove('token', { path: '/' });
  window.dispatchEvent(new Event(CREDENTIAL_CHANGED));
}
