/** @jest-environment jsdom */

import { clearConversationCache } from '@/page/chat/conversation/conversationCache';

import {
  removeGlobalCredential,
  setGlobalCredential,
  subscribeCredentials,
} from './util';

jest.mock('@/page/chat/conversation/conversationCache', () => ({
  clearConversationCache: jest.fn(),
}));

jest.mock('js-cookie', () => ({
  __esModule: true,
  default: { remove: jest.fn(), set: jest.fn() },
}));

const mockClearConversationCache = jest.mocked(clearConversationCache);

describe('credential conversation cache cleanup', () => {
  beforeEach(() => {
    localStorage.clear();
    mockClearConversationCache.mockClear();
  });

  it('notifies subscribers on login, logout and cross-tab changes', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeCredentials(listener);
    expect(listener).toHaveBeenLastCalledWith(null);
    setGlobalCredential('user-a', 'token-a');
    expect(listener).toHaveBeenLastCalledWith({
      userId: 'user-a',
      token: 'token-a',
    });
    removeGlobalCredential();
    expect(listener).toHaveBeenLastCalledWith(null);
    localStorage.setItem('uid', 'user-b');
    localStorage.setItem('token', 'token-b');
    window.dispatchEvent(new StorageEvent('storage', { key: 'token' }));
    expect(listener).toHaveBeenLastCalledWith({
      userId: 'user-b',
      token: 'token-b',
    });
    unsubscribe();
    listener.mockClear();
    removeGlobalCredential();
    expect(listener).not.toHaveBeenCalled();
  });

  it('clears conversations before removing credentials', () => {
    localStorage.setItem('uid', 'user-a');

    removeGlobalCredential();

    expect(mockClearConversationCache).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('uid')).toBeNull();
  });

  it('clears conversations when credentials switch users', () => {
    localStorage.setItem('uid', 'user-a');

    setGlobalCredential('user-b', 'invalid-token');

    expect(mockClearConversationCache).toHaveBeenCalledTimes(1);
  });

  it('keeps conversations when refreshing credentials for the same user', () => {
    localStorage.setItem('uid', 'user-a');

    setGlobalCredential('user-a', 'invalid-token');

    expect(mockClearConversationCache).not.toHaveBeenCalled();
  });
});
