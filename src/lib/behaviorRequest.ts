export type RequestActionType =
  | 'resource_add'
  | 'resource_edit'
  | 'ai_conversation'
  | 'annotation_comment'
  | 'document_comment';
type Headers = Record<string, string>;
let scope = () => '';
let markEditorInput: ((resourceId: string) => void) | undefined;
const uploads = new Map<string, { scope: string; headers: Headers }>();
const edits = new Map<string, { scope: string; headers: Headers }>();
const actions = new Map<string, string>();
const comments = new Map<string, { scope: string; headers: Headers }>();
let begin:
  | ((
      type: RequestActionType,
      props: Record<string, string>
    ) => Record<string, string>)
  | undefined;
export function registerBehaviorRequestStarter(
  start: typeof begin,
  identity: () => string,
  onEditorInput?: (resourceId: string) => void
) {
  begin = start;
  scope = identity;
  markEditorInput = onEditorInput;
}
function bounded<T>(map: Map<string, T>, key: string, value: T) {
  map.delete(key);
  map.set(key, value);
  if (map.size > 100) map.delete(map.keys().next().value!);
}
export function beginEditorInput(resourceId: string) {
  markEditorInput?.(resourceId);
  const existing = edits.get(resourceId);
  if (
    existing?.scope ===
    scope() + ':' + Math.floor((Date.now() + 28_800_000) / 86_400_000)
  )
    return;
  const headers = begin?.('resource_edit', { resource_id: resourceId }) || {};
  bounded(edits, resourceId, {
    scope: scope() + ':' + Math.floor((Date.now() + 28_800_000) / 86_400_000),
    headers,
  });
}
export function beginCommentActivation(
  resourceId: string,
  type: 'annotation_comment' | 'document_comment'
) {
  const headers = begin?.(type, { resource_id: resourceId }) || {};
  bounded(comments, resourceId + ':' + type, { scope: scope(), headers });
}
export function rememberBehaviorUpload(
  url: string,
  headers: Headers,
  data: unknown
) {
  const id = (data as { id?: string })?.id;
  const action = headers['x-omnibox-action-id'];
  if (
    url.split('?')[0].endsWith('/resources/files') &&
    id &&
    action &&
    actions.get(action) === scope()
  )
    bounded(uploads, id, {
      scope: scope(),
      headers: Object.fromEntries(
        Object.entries(headers).filter(([key]) =>
          key.startsWith('x-omnibox-action-')
        )
      ),
    });
}

/** Matches only explicit product writes; background synchronization has no registered starter. */
export function behaviorRequestKind(
  method: string,
  url: string,
  body?: unknown
): RequestActionType | undefined {
  const path = url
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/api\/v1/, '')
    .split('?')[0];
  const data =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const verb = method.toUpperCase();
  if (
    verb === 'POST' &&
    /^\/namespaces\/[^/]+\/wizard\/collect\/url$/.test(path)
  )
    return 'resource_add';
  if (
    verb === 'POST' &&
    /^\/namespaces\/[^/]+\/resources(?:\/batch-folder|\/files)?$/.test(path)
  )
    return 'resource_add';
  if (
    verb === 'POST' &&
    /^\/namespaces\/[^/]+\/(smart-folders|rss-folders)$/.test(path)
  )
    return 'resource_add';
  if (
    verb === 'PATCH' &&
    /^\/namespaces\/[^/]+\/resources\/[^/]+$/.test(path) &&
    ['name', 'content'].some(key => key in data)
  )
    return 'resource_edit';
  if (verb === 'POST' && /\/wizard\/(ask|chat)$/.test(path))
    return 'ai_conversation';
  if (
    verb === 'POST' &&
    /^\/namespaces\/[^/]+\/resources\/[^/]+\/comment-threads$/.test(path)
  )
    return data.type === 'document' ? 'document_comment' : 'annotation_comment';
  if (
    verb === 'POST' &&
    /^\/namespaces\/[^/]+\/resources\/[^/]+\/comment-threads\/[^/]+\/comments$/.test(
      path
    )
  )
    return 'annotation_comment';
  return undefined;
}
export function behaviorRequestHeaders(
  method: string,
  url: string,
  body?: unknown
) {
  const type = behaviorRequestKind(method, url, body);
  if (!type || !begin) return {};
  const data =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const upload =
    typeof data.file_id === 'string' ? uploads.get(data.file_id) : undefined;
  if (upload?.scope === scope()) return upload.headers;
  const commentResource = url.match(/\/resources\/([^/]+)\/comment-threads/);
  const comment = commentResource
    ? comments.get(commentResource[1] + ':' + type)
    : undefined;
  if (comment?.scope === scope()) return comment.headers;
  const resourceId = url.split('?')[0].split('/').pop() || '';
  const edit = type === 'resource_edit' ? edits.get(resourceId) : undefined;
  if (
    edit?.scope ===
    scope() + ':' + Math.floor((Date.now() + 28_800_000) / 86_400_000)
  )
    return edit.headers;
  const headers = begin(type, {});
  if (headers['x-omnibox-action-id'])
    bounded(actions, headers['x-omnibox-action-id'], scope());
  return headers;
}
