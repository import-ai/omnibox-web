import { createInstance } from 'i18next';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';

import {
  chatErrorAliases,
  chatErrorDetails,
  chatErrorKey,
  chatErrorNames,
  isChatCancellation,
} from './chatErrors';

describe('chat error classification', () => {
  it.each([
    [
      { code: 'CONVERSATION_BUSY', message: 'Unknown error', status: 409 },
      'busy',
    ],
    [
      {
        code: 'new_backend_code',
        message: 'Software caused connection abort',
        status: 500,
      },
      'connection_interrupted',
    ],
    [
      {
        response: {
          status: 403,
          data: { code: 'TOKEN_EXPIRED', message: 'internal' },
        },
      },
      'unauthorized',
    ],
    [new TypeError('Failed to fetch'), 'connection_interrupted'],
    ['Response body is not readable', 'response_unreadable'],
    ['Inappropriate content', 'service_unavailable'],
    [{ status: 429, message: '<html>upstream</html>' }, 'rate_limited'],
    [{ status: 413 }, 'file_too_large'],
    [{ code: 'STORAGE_QUOTA_EXCEEDED', status: 403 }, 'storage_full'],
    [{ message: ['private detail'], status: 422 }, 'invalid_request'],
    ['{"code":"CONVERSATION_BUSY","message":"internal"}', 'busy'],
    [
      'NetworkError when attempting to fetch resource.',
      'connection_interrupted',
    ],
  ])('classifies %p as %s', (error, suffix) => {
    expect(chatErrorKey(error)).toBe(`chat.errors.${suffix}`);
  });

  it.each([
    null,
    undefined,
    '',
    [],
    { message: {} },
    'provider secret detail',
    '<html>502 gateway</html>',
  ])('does not pass unknown payload %p to the user', error => {
    expect(chatErrorKey(error)).toBe('chat.errors.unknown');
  });

  it('uses an operation-specific fallback without losing known causes', () => {
    expect(chatErrorKey('private detail', 'chat.errors.tool_failed')).toBe(
      'chat.errors.tool_failed'
    );
    expect(chatErrorKey({ status: 401 }, 'chat.errors.tool_failed')).toBe(
      'chat.errors.unauthorized'
    );
  });

  it('extracts safe scalar metadata without coercing payload objects', () => {
    expect(
      chatErrorDetails({
        response: {
          status: 403,
          data: { code: 'FORBIDDEN', message: ['invalid'] },
        },
      })
    ).toEqual({ code: 'FORBIDDEN', status: 403 });
    expect(chatErrorDetails(new Error('failure'))).toMatchObject({
      message: 'failure',
    });
  });

  it('distinguishes locally canceled requests from server text', () => {
    expect(isChatCancellation({ name: 'AbortError' })).toBe(true);
    expect(isChatCancellation({ __CANCEL__: true })).toBe(true);
    expect(isChatCancellation('AbortError')).toBe(false);
  });

  it('translates the same historical error using the current UI language', async () => {
    const i18n = createInstance();
    await i18n.init({
      lng: 'zh',
      fallbackLng: 'en',
      resources: { zh: { translation: zh }, en: { translation: en } },
    });
    const storedError = { message: 'Software caused connection abort' };
    expect(i18n.t(chatErrorKey(storedError))).toBe(
      '网络连接异常，请检查网络后重试。'
    );
    await i18n.changeLanguage('en-US');
    expect(i18n.t(chatErrorKey(storedError))).toBe(
      'Connection interrupted. Check your network and try again.'
    );
    await i18n.changeLanguage('fr-FR');
    expect(i18n.t(chatErrorKey(storedError))).toBe(
      en.chat.errors.connection_interrupted
    );
    await i18n.changeLanguage('zh-CN');
    expect(i18n.t(chatErrorKey(storedError))).toBe(
      zh.chat.errors.connection_interrupted
    );
    expect(storedError.message).toBe('Software caused connection abort');
  });
});

it.each(['constructor', '__proto__', 'toString'])(
  'does not treat inherited property %s as a known error',
  message => {
    expect(chatErrorKey({ code: message, message })).toBe(
      'chat.errors.unknown'
    );
  }
);

it('uses HTTP context when the message is only a generic upstream fallback', () => {
  expect(chatErrorKey({ message: 'Unknown error', status: 429 })).toBe(
    'chat.errors.rate_limited'
  );
  expect(
    chatErrorKey({ message: 'Failed to fetch from wizard', status: 503 })
  ).toBe('chat.errors.service_unavailable');
});

it.each(Object.entries(chatErrorAliases))(
  'covers the catalog alias %s in both languages',
  (message, suffix) => {
    expect(chatErrorKey(message)).toBe(`chat.errors.${suffix}`);
    expect(zh.chat.errors[suffix]).toBeTruthy();
    expect(en.chat.errors[suffix]).toBeTruthy();
  }
);
it('has matching, nonempty resources for every supported classification', () => {
  expect(Object.keys(zh.chat.errors).sort()).toEqual(
    [...chatErrorNames].sort()
  );
  expect(Object.keys(en.chat.errors).sort()).toEqual(
    [...chatErrorNames].sort()
  );
});

it.each([
  [401, 'unauthorized'],
  [403, 'forbidden'],
  [404, 'not_found'],
  [408, 'timeout'],
  [504, 'timeout'],
  [413, 'file_too_large'],
  [415, 'unsupported_file'],
  [429, 'rate_limited'],
  [422, 'invalid_request'],
  [502, 'service_unavailable'],
])(
  'classifies HTTP %s without displaying its dynamic detail',
  (status, key) => {
    expect(chatErrorKey({ status, message: 'private detail' })).toBe(
      `chat.errors.${key}`
    );
  }
);
it.each(['ECONNABORTED', 'ETIMEDOUT'])('classifies timeout code %s', code => {
  expect(chatErrorKey({ code })).toBe('chat.errors.timeout');
});
it('classifies a typed timeout', () => {
  expect(chatErrorKey({ name: 'TimeoutError' })).toBe('chat.errors.timeout');
});

it.each(['STREAM_CONNECTION_FAILED', 'STREAM_READ_FAILED'])(
  'classifies typed transport failures independently of browser wording (%s)',
  code => {
    expect(chatErrorKey({ code, message: 'unfamiliar browser failure' })).toBe(
      'chat.errors.connection_interrupted'
    );
  }
);

it.each([
  ['content_review_rejected', 'content_review'],
  ['output_content_review_rejected', 'output_content_review'],
  ['upstream_bad_request', 'upstream_error'],
  ['upstream_unauthorized', 'upstream_error'],
  ['upstream_forbidden', 'upstream_error'],
  ['upstream_not_found', 'upstream_error'],
  ['upstream_conflict', 'upstream_error'],
  ['upstream_unprocessable', 'upstream_error'],
  ['upstream_rate_limited', 'upstream_error'],
  ['upstream_server_error', 'upstream_error'],
  ['upstream_timeout', 'upstream_error'],
  ['upstream_connection_failed', 'upstream_error'],
  ['upstream_api_error', 'upstream_error'],
  ['internal_error', 'upstream_error'],
])('classifies the new server code %s as %s', (code, suffix) => {
  expect(chatErrorKey({ code, message: 'upstream detail' })).toBe(
    `chat.errors.${suffix}`
  );
});

it.each([
  [
    '本次请求未通过模型服务的安全审核，请修改相关内容后重试，或新建对话。',
    'content_review',
  ],
  [
    "This request did not pass the model service's safety review. Edit the relevant content and try again, or start a new conversation.",
    'content_review',
  ],
  [
    '生成的回复未通过模型服务的安全审核，请新建对话或修改后重试。',
    'output_content_review',
  ],
  [
    "The generated reply did not pass the model service's safety review. Start a new conversation or edit the relevant content and try again.",
    'output_content_review',
  ],
  ['网络错误，请稍后重试。', 'upstream_error'],
  ['Network error. Please try again later.', 'upstream_error'],
])('classifies the stored server copy %p as %s', (message, suffix) => {
  expect(chatErrorKey({ message })).toBe(`chat.errors.${suffix}`);
});
