/** @jest-environment jsdom */

import { ConversationDetail } from '@/page/chat/core/types/conversation';

import {
  clearCachedConversation,
  clearCachedConversationIfUnchanged,
  clearConversationCache,
  getCachedConversation,
  getCachedConversationRevision,
  getCachedConversationTitle,
  setCachedConversation,
} from './conversationCache';

const userAScope = { userId: 'user-a', namespaceId: 'namespace-a' };

describe('conversationCache', () => {
  afterEach(() => {
    clearConversationCache();
  });

  it('stores conversation detail for warm remounts', () => {
    const conversation: ConversationDetail = {
      id: 'conversation-a',
      title: 'Cached title',
      mapping: {},
    };
    setCachedConversation(userAScope, conversation);

    expect(getCachedConversation(userAScope, 'conversation-a')).toEqual(
      conversation
    );
    expect(getCachedConversationTitle(userAScope, 'conversation-a')).toBe(
      'Cached title'
    );
  });

  it('isolates the same conversation id between users', () => {
    setCachedConversation(userAScope, {
      id: 'conversation-a',
      title: 'User A secret',
      mapping: {},
    });

    expect(
      getCachedConversation(
        { userId: 'user-b', namespaceId: 'namespace-a' },
        'conversation-a'
      )
    ).toBeUndefined();
  });

  it('isolates the same conversation id between namespaces', () => {
    setCachedConversation(userAScope, {
      id: 'conversation-a',
      title: 'Namespace A secret',
      mapping: {},
    });

    expect(
      getCachedConversation(
        { userId: 'user-a', namespaceId: 'namespace-b' },
        'conversation-a'
      )
    ).toBeUndefined();
  });

  it('clears one scoped conversation without affecting another user', () => {
    const userBScope = { userId: 'user-b', namespaceId: 'namespace-a' };
    setCachedConversation(userAScope, {
      id: 'conversation-a',
      mapping: {},
    });
    setCachedConversation(userBScope, {
      id: 'conversation-a',
      mapping: {},
    });

    clearCachedConversation(userAScope, 'conversation-a');

    expect(getCachedConversation(userAScope, 'conversation-a')).toBeUndefined();
    expect(getCachedConversation(userBScope, 'conversation-a')).toBeDefined();
  });

  it('keeps the revision stable when the same hydrated object is written again', () => {
    const conversation: ConversationDetail = {
      id: 'conversation-a',
      mapping: {},
    };
    setCachedConversation(userAScope, conversation);
    const firstRevision = getCachedConversationRevision(
      userAScope,
      'conversation-a'
    );

    setCachedConversation(userAScope, conversation);

    expect(getCachedConversationRevision(userAScope, 'conversation-a')).toBe(
      firstRevision
    );
  });

  it('only clears an unchanged cache revision', () => {
    setCachedConversation(userAScope, {
      id: 'conversation-a',
      title: 'Old',
      mapping: {},
    });
    const oldRevision = getCachedConversationRevision(
      userAScope,
      'conversation-a'
    );
    setCachedConversation(userAScope, {
      id: 'conversation-a',
      title: 'New',
      mapping: {},
    });

    expect(
      clearCachedConversationIfUnchanged(
        userAScope,
        'conversation-a',
        oldRevision
      )
    ).toBe(false);
    expect(getCachedConversationTitle(userAScope, 'conversation-a')).toBe(
      'New'
    );
  });

  it('does not reuse revisions after clearing the whole cache', () => {
    setCachedConversation(userAScope, {
      id: 'conversation-a',
      title: 'Old session',
      mapping: {},
    });
    const oldRevision = getCachedConversationRevision(
      userAScope,
      'conversation-a'
    );
    clearConversationCache();
    setCachedConversation(userAScope, {
      id: 'conversation-a',
      title: 'New session',
      mapping: {},
    });

    expect(
      clearCachedConversationIfUnchanged(
        userAScope,
        'conversation-a',
        oldRevision
      )
    ).toBe(false);
    expect(getCachedConversationTitle(userAScope, 'conversation-a')).toBe(
      'New session'
    );
  });

  it('evicts the least recently used conversation after 20 entries', () => {
    for (let index = 0; index < 20; index += 1) {
      setCachedConversation(userAScope, {
        id: `conversation-${index}`,
        mapping: {},
      });
    }
    expect(getCachedConversation(userAScope, 'conversation-0')).toBeDefined();

    setCachedConversation(userAScope, {
      id: 'conversation-20',
      mapping: {},
    });

    expect(getCachedConversation(userAScope, 'conversation-0')).toBeDefined();
    expect(getCachedConversation(userAScope, 'conversation-1')).toBeUndefined();
  });
});
