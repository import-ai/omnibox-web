/** @jest-environment jsdom */

import { clearConversationCache } from '@/page/chat/conversation/conversationCache';

import { removeGlobalCredential, setGlobalCredential } from './util';

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
