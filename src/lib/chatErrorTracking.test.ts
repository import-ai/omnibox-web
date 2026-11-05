import { getChatErrorScope, track } from '@/lib/sendTrackEvent';

import {
  chatErrorDedupeKey,
  chatErrorGroup,
  reportChatError,
  reportChatErrorDisplay,
} from './chatErrorTracking';

jest.mock('@/lib/sendTrackEvent', () => ({
  track: jest.fn(() => Promise.resolve()),
  getChatErrorScope: jest.fn(() => 'api:user-a'),
}));

const mockedTrack = jest.mocked(track);

beforeEach(() => {
  mockedTrack.mockClear();
});

test('reports a classified, sanitized chat error', () => {
  const error = Object.assign(new Error('Bearer secret token=abc'), {
    code: 'ECONNRESET',
    status: 503,
  });

  reportChatError(error, {
    conversationId: 'conversation-1',
    requestId: 'request-1',
    messageId: 'message-1',
    parentMessageId: 'parent-1',
    channel: 'web',
    stage: 'stream',
    clientState: 'streaming',
  });

  expect(mockedTrack).toHaveBeenCalledWith(
    'chat_error',
    expect.objectContaining({
      schema_version: 1,
      conversation_id: 'conversation-1',
      request_id: 'request-1',
      message_id: 'message-1',
      parent_message_id: 'parent-1',
      channel: 'web',
      stage: 'stream',
      error_category: 'connection_interrupted',
      error_group: 'network',
      error_code: 'ECONNRESET',
      http_status: 503,
      error_message: 'Bearer [redacted] token=[redacted]',
      user_visible: true,
      retryable: true,
      client_state: 'streaming',
      source: 'client',
      dedupe_key: 'request-1:stream:econnreset:streaming:visible',
    })
  );
});

test('deduplicates the same error within a request stage', () => {
  const error = { status: 429, message: 'slow down' };
  const context = {
    conversationId: 'conversation-2',
    requestId: 'request-2',
    stage: 'transport' as const,
  };

  reportChatError(error, context);
  reportChatError(error, context);

  expect(mockedTrack).toHaveBeenCalledTimes(1);
  expect(chatErrorGroup(error)).toBe('quota');
  expect(chatErrorDedupeKey(error, context)).toBe(
    'request-2:transport:rate_limited::visible'
  );
});

test('keeps background and user-visible errors in separate dedupe buckets', () => {
  const error = { status: 503, message: 'unavailable' };
  const context = {
    conversationId: 'conversation-5',
    requestId: 'request-5',
    stage: 'history' as const,
    clientState: 'loading_latest_history',
  };

  reportChatError(error, { ...context, userVisible: false });
  reportChatError(error, context);

  expect(mockedTrack).toHaveBeenCalledTimes(2);
  expect(mockedTrack.mock.calls[0][1]).toMatchObject({
    user_visible: false,
    dedupe_key:
      'request-5:history:service_unavailable:loading_latest_history:hidden',
  });
  expect(mockedTrack.mock.calls[1][1]).toMatchObject({
    user_visible: true,
    dedupe_key:
      'request-5:history:service_unavailable:loading_latest_history:visible',
  });
});

test('does not report user cancellations', () => {
  reportChatError(Object.assign(new Error('aborted'), { name: 'AbortError' }), {
    conversationId: 'conversation-3',
    stage: 'stream',
  });

  expect(mockedTrack).not.toHaveBeenCalled();
});

test('does not report expected decision control flow', () => {
  reportChatError(
    {
      code: 'PENDING_INTERRUPT',
      message: 'This conversation is waiting for a tool decision',
    },
    {
      conversationId: 'conversation-4',
      requestId: 'request-4',
      stage: 'stream',
    }
  );

  expect(mockedTrack).not.toHaveBeenCalled();
});

test('reports the exact red text the user saw with conversation context', () => {
  const error = { status: 503, message: 'provider detail' };

  reportChatErrorDisplay(
    '服务出现异常，请先检查任务结果。',
    {
      conversationId: 'conversation-display-1',
      messageId: 'message-display-1',
      requestId: 'request-display-1',
      parentMessageId: 'parent-display-1',
      channel: 'web',
      stage: 'display',
      clientState: 'failed_message',
    },
    error
  );

  expect(mockedTrack).toHaveBeenCalledWith(
    'chat_error',
    expect.objectContaining({
      conversation_id: 'conversation-display-1',
      message_id: 'message-display-1',
      request_id: 'request-display-1',
      parent_message_id: 'parent-display-1',
      stage: 'display',
      error_category: 'service_unavailable',
      error_group: 'service',
      error_message: 'provider detail',
      display_message: '服务出现异常，请先检查任务结果。',
      error_surface: 'inline',
      user_visible: true,
      client_state: 'failed_message',
      dedupe_key:
        'display:conversation-display-1:message-display-1:request-display-1:服务出现异常，请先检查任务结果。',
    })
  );
});

test('deduplicates the same red text for one message and reports changed text', () => {
  const context = {
    conversationId: 'conversation-display-2',
    messageId: 'message-display-2',
    stage: 'display' as const,
  };

  reportChatErrorDisplay('网络连接异常，请检查网络后重试。', context);
  reportChatErrorDisplay('网络连接异常，请检查网络后重试。', context);
  reportChatErrorDisplay(
    'Connection interrupted. Check your network and try again.',
    context
  );

  expect(mockedTrack).toHaveBeenCalledTimes(2);
  expect(
    mockedTrack.mock.calls.map(([, props]) => props?.display_message)
  ).toEqual([
    '网络连接异常，请检查网络后重试。',
    'Connection interrupted. Check your network and try again.',
  ]);
});

test('does not report empty red text', () => {
  reportChatErrorDisplay('', {
    conversationId: 'conversation-display-3',
    messageId: 'message-display-3',
    stage: 'display',
  });

  expect(mockedTrack).not.toHaveBeenCalled();
});

test.each([
  ['stream_interrupted', 'network'],
  ['stream_send_failed', 'network'],
  ['content_review_rejected', 'request'],
  ['output_content_review_rejected', 'request'],
  ['upstream_timeout', 'service'],
  ['upstream_connection_failed', 'service'],
  ['upstream_rate_limited', 'service'],
  ['internal_error', 'service'],
])('groups existing error code %s as %s', (code, group) => {
  expect(chatErrorGroup({ code })).toBe(group);
});

test('visible red copy is independently reported after account or API scope changes', () => {
  const context = {
    conversationId: 'shared',
    messageId: 'same',
    stage: 'display' as const,
  };
  for (const scope of ['api:user-a', 'api:user-b', 'other-api:user-b']) {
    jest.mocked(getChatErrorScope).mockReturnValue(scope);
    reportChatErrorDisplay('same copy', context);
    reportChatErrorDisplay('same copy', context);
  }
  expect(mockedTrack).toHaveBeenCalledTimes(3);
});
