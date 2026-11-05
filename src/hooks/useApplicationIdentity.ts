import { useSyncExternalStore } from 'react';

import { subscribeCredentials } from '@/page/user/util';

export const getApplicationIdentity = () => localStorage.getItem('uid');
const subscribe = (notify: () => void) => subscribeCredentials(() => notify());

/** Scope integration requests to the current account, including cross-tab changes. */
export function useApplicationIdentity() {
  return useSyncExternalStore(subscribe, getApplicationIdentity);
}
