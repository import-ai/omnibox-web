import {
  isConversationAccessDenied,
  isConversationAuthenticationFailure,
  shouldClearVisibleConversation,
  shouldInvalidateConversation,
} from './conversationLoadPolicy';

describe('conversationLoadPolicy', () => {
  it('invalidates hydrated cache after any initial load failure', () => {
    expect(shouldInvalidateConversation('hydrate', new Error('offline'))).toBe(
      true
    );
    expect(
      shouldInvalidateConversation('hydrate', { response: { status: 500 } })
    ).toBe(true);
  });

  it.each([401, 403, 404, 410])(
    'invalidates refreshed data for status %s',
    status => {
      expect(
        shouldInvalidateConversation('refresh', { response: { status } })
      ).toBe(true);
    }
  );

  it.each([undefined, 408, 429, 500, 503])(
    'keeps verified data for transient refresh status %s',
    status => {
      const error = status === undefined ? new Error('offline') : { status };
      expect(shouldInvalidateConversation('refresh', error)).toBe(false);
    }
  );

  it('detects only authentication failures', () => {
    expect(
      isConversationAuthenticationFailure({ response: { status: 401 } })
    ).toBe(true);
    expect(
      isConversationAuthenticationFailure({ response: { status: 403 } })
    ).toBe(false);
  });

  it.each([403, 404, 410])(
    'treats status %s as conversation access denied',
    status => {
      expect(isConversationAccessDenied({ response: { status } })).toBe(true);
    }
  );

  it.each([undefined, 401, 408, 429, 500, 503])(
    'does not treat status %s as conversation access denied',
    status => {
      const error = status === undefined ? new Error('offline') : { status };
      expect(isConversationAccessDenied(error)).toBe(false);
    }
  );

  it.each([
    {
      currentUserId: 'user-a',
      destroyed: false,
      error: new Error('offline'),
      expected: true,
      requestUserId: 'user-a',
    },
    {
      currentUserId: 'user-a',
      destroyed: true,
      error: { response: { status: 403 } },
      expected: false,
      requestUserId: 'user-a',
    },
    {
      currentUserId: 'user-b',
      destroyed: false,
      error: { response: { status: 403 } },
      expected: false,
      requestUserId: 'user-a',
    },
    {
      currentUserId: '',
      destroyed: false,
      error: { response: { status: 401 } },
      expected: true,
      requestUserId: 'user-a',
    },
  ])('evaluates visible cleanup for %#', context => {
    const { expected, ...failureContext } = context;
    expect(shouldClearVisibleConversation(failureContext)).toBe(expected);
  });
});
