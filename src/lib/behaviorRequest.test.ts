import {
  beginCommentActivation,
  beginEditorInput,
  behaviorRequestHeaders,
  behaviorRequestKind,
  registerBehaviorRequestStarter,
  rememberBehaviorUpload,
} from './behaviorRequest';
let scope: string;
let id: number;
beforeEach(() => {
  scope = `user-${Math.random()}`;
  id = 0;
  registerBehaviorRequestStarter(
    type => ({
      'x-omnibox-action-id': `${scope}-${++id}`,
      'x-omnibox-action-type': type,
      'x-omnibox-action-started-at': new Date().toISOString(),
    }),
    () => scope
  );
});
it('classifies manual product writes but excludes trace, reads, internal RSS, and attrs-only patches', () => {
  expect(behaviorRequestKind('POST', '/api/v1/namespaces/ns/rss-folders')).toBe(
    'resource_add'
  );
  expect(
    behaviorRequestKind('POST', '/api/v1/namespaces/ns/smart-folders')
  ).toBe('resource_add');
  expect(behaviorRequestKind('POST', '/api/v1/namespaces/ns/wizard/chat')).toBe(
    'ai_conversation'
  );
  expect(
    behaviorRequestKind('POST', '/internal/api/v1/namespaces/ns/rss-folders')
  ).toBeUndefined();
  expect(behaviorRequestKind('POST', '/api/v1/trace')).toBeUndefined();
  expect(
    behaviorRequestKind('PATCH', '/namespaces/ns/resources/r', { attrs: {} })
  ).toBeUndefined();
  expect(
    behaviorRequestKind('GET', '/namespaces/ns/resources/r')
  ).toBeUndefined();
});
it('preserves one initiation across upload form, binary upload, and final resource creation without caching auth', () => {
  const first = behaviorRequestHeaders(
    'POST',
    '/namespaces/ns/resources/files'
  );
  rememberBehaviorUpload(
    '/namespaces/ns/resources/files',
    { ...first, Authorization: 'not-a-real-credential' },
    { id: 'file' }
  );
  expect(
    behaviorRequestHeaders('POST', '/namespaces/ns/resources', {
      file_id: 'file',
    })
  ).toEqual(first);
  expect(id).toBe(1);
  scope = 'another-user';
  expect(
    behaviorRequestHeaders('POST', '/namespaces/ns/resources', {
      file_id: 'file',
    })
  ).not.toEqual(first);
});
it('joins saves to first genuine input and keeps programmatic mount out of the input API', () => {
  beginEditorInput('resource');
  beginEditorInput('resource');
  expect(id).toBe(1);
  expect(
    behaviorRequestHeaders('PATCH', '/namespaces/ns/resources/resource', {
      content: 'never-sent-as-a-dimension',
    })['x-omnibox-action-id']
  ).toBe(`${scope}-1`);
});
it('keeps annotation and document activations separate when switching comment modes', () => {
  beginCommentActivation('resource', 'annotation_comment');
  beginCommentActivation('resource', 'document_comment');
  expect(
    behaviorRequestHeaders(
      'POST',
      '/namespaces/ns/resources/resource/comment-threads',
      { type: 'document' }
    )['x-omnibox-action-id']
  ).toBe(`${scope}-2`);
  expect(
    behaviorRequestHeaders(
      'POST',
      '/namespaces/ns/resources/resource/comment-threads',
      { type: 'inline' }
    )['x-omnibox-action-id']
  ).toBe(`${scope}-1`);
  expect(
    behaviorRequestHeaders(
      'POST',
      '/namespaces/ns/resources/resource/comment-threads/t/comments'
    )['x-omnibox-action-id']
  ).toBe(`${scope}-3`);
});

it('tracks explicit URL collection but excludes reads, internal ingestion, and compressed collection', () => {
  const path = '/api/v1/namespaces/ns/wizard/collect/url';
  expect(behaviorRequestKind('POST', path)).toBe('resource_add');
  expect(behaviorRequestHeaders('POST', path)['x-omnibox-action-type']).toBe(
    'resource_add'
  );
  expect(behaviorRequestKind('GET', path)).toBeUndefined();
  expect(behaviorRequestKind('POST', '/internal' + path)).toBeUndefined();
  expect(
    behaviorRequestKind('POST', '/api/v1/namespaces/ns/wizard/collect/gzip')
  ).toBeUndefined();
});

for (const type of ['annotation_comment', 'document_comment'] as const) {
  it(
    'starts a new ' + type + ' action for a new submission after midnight',
    () => {
      jest.useFakeTimers({ now: Date.parse('2026-11-11T15:59:00Z') });
      try {
        const url = '/namespaces/ns/resources/midnight/comment-threads';
        const body = {
          type: type === 'document_comment' ? 'document' : 'inline',
        };
        beginCommentActivation('midnight', type);
        const first = behaviorRequestHeaders('POST', url, body);
        jest.setSystemTime(new Date('2026-11-11T16:01:00Z'));
        const second = behaviorRequestHeaders('POST', url, body);
        expect(second['x-omnibox-action-id']).not.toBe(
          first['x-omnibox-action-id']
        );
        expect(second['x-omnibox-action-started-at']).toBe(
          '2026-11-11T16:01:00.000Z'
        );
        expect(first['x-omnibox-action-started-at']).toBe(
          '2026-11-11T15:59:00.000Z'
        );
      } finally {
        jest.useRealTimers();
      }
    }
  );
}
it('does not reuse an unconsumed activation from yesterday or another account', () => {
  jest.useFakeTimers({ now: Date.parse('2026-11-11T15:59:00Z') });
  try {
    const url = '/namespaces/ns/resources/stale/comment-threads';
    beginCommentActivation('stale', 'annotation_comment');
    jest.setSystemTime(new Date('2026-11-11T16:01:00Z'));
    expect(
      behaviorRequestHeaders('POST', url)['x-omnibox-action-started-at']
    ).toBe('2026-11-11T16:01:00.000Z');
    beginCommentActivation('stale', 'annotation_comment');
    scope = 'different-account';
    expect(behaviorRequestHeaders('POST', url)['x-omnibox-action-id']).toBe(
      'different-account-4'
    );
  } finally {
    jest.useRealTimers();
  }
});
