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
  ).toBe(`${scope}-1`);
});
