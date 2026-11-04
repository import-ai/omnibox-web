import Cookies from 'js-cookie';

import { clearConversationCache } from '@/page/chat/conversation/conversationCache';

/**
 * Fired in the tab that changed the credentials. The cross-tab `storage`
 * event does not reach the tab that performed the change, so consumers that
 * must react immediately, such as cancelling in-flight requests, listen here.
 */
export const CREDENTIAL_CHANGED_EVENT = 'omnibox:credential-changed';

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
  window.addEventListener(CREDENTIAL_CHANGED_EVENT, notify);
  window.addEventListener('storage', onStorage);
  notify();
  return () => {
    window.removeEventListener(CREDENTIAL_CHANGED_EVENT, notify);
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
  // The httpOnly token cookie belongs to the backend. Writing it here would
  // create a second, javascript-readable cookie with a different SameSite
  // policy and let the two copies drift out of sync.
  window.dispatchEvent(new Event(CREDENTIAL_CHANGED_EVENT));
}

export function removeGlobalCredential() {
  clearConversationCache();
  localStorage.removeItem('uid');
  localStorage.removeItem('token');
  Cookies.remove('token', { path: '/' });
  window.dispatchEvent(new Event(CREDENTIAL_CHANGED_EVENT));
}
