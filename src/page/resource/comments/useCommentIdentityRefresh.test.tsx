/** @jest-environment jsdom */

import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { USER_UPDATED_EVENT } from '@/hooks/useUser';
import type { ResourceCommentThread } from '@/interface';
import { http } from '@/lib/request';
import { getResourceCommentThread } from '@/service/resourceComments';

import { useCommentIdentityRefresh } from './useCommentIdentityRefresh';

jest.mock('@/hooks/useUser', () => ({ USER_UPDATED_EVENT: 'user-updated' }));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('@/service/resourceComments', () => ({
  getResourceCommentThread: jest.fn(),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function thread(id: string, name = 'Original'): ResourceCommentThread {
  const author = { id: 'author', username: 'account', display_name: name };
  return {
    id,
    type: 'document',
    anchor: null,
    quoted_text: '',
    resolved: false,
    creator: author,
    comments: [
      {
        id: `${id}-comment`,
        author,
        content: 'Original body',
        created_at: '2026-10-27T00:00:00Z',
        updated_at: '2026-10-27T00:00:00Z',
      },
    ],
    created_at: '2026-10-27T00:00:00Z',
    updated_at: '2026-10-27T00:00:00Z',
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => {
    resolve = next;
  });
  return { promise, resolve };
}
const versions = new Map<string, number>();
let identity: ReturnType<typeof useCommentIdentityRefresh>;
function Fixture({
  rows,
  resourceId = 'resource',
  namespaceId = 'namespace',
  memberNamesKey = '',
}: {
  rows: ResourceCommentThread[];
  resourceId?: string;
  namespaceId?: string;
  memberNamesKey?: string;
}) {
  const localVersions = useRef(versions);
  identity = useCommentIdentityRefresh({
    namespaceId,
    resourceId,
    enabled: true,
    threads: rows,
    localVersions,
    memberNamesKey,
  });
  return null;
}

describe('comment identity refresh isolation', () => {
  let root: Root;
  const render = async (props: Parameters<typeof Fixture>[0]) => {
    await act(async () => root.render(<Fixture {...props} />));
  };
  const refresh = async () => {
    await act(async () => window.dispatchEvent(new Event('focus')));
  };
  beforeEach(() => {
    versions.clear();
    jest.resetAllMocks();
    jest.mocked(http.get).mockResolvedValue({
      mention_display_names: { mentioned: 'Current mention' },
    });
    jest
      .mocked(getResourceCommentThread)
      .mockImplementation(async (_ns, _resource, id) => thread(id, 'Current'));
    root = createRoot(document.createElement('div'));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('projects identity metadata without adopting remote content, replies, resolution or anchors', async () => {
    const original = thread('one');
    const remote = {
      ...thread('one', 'Renamed'),
      resolved: true,
      mention_display_names: { mentioned: 'Frozen mention' },
      comments: [
        { ...thread('one', 'Renamed').comments[0], content: 'Concurrent body' },
        ...thread('remote-reply').comments,
      ],
    };
    jest.mocked(getResourceCommentThread).mockResolvedValue(remote);
    await render({ rows: [original] });
    await refresh();
    const displayed = identity.withIdentity(original);
    expect(displayed.creator.display_name).toBe('Renamed');
    expect(displayed.comments[0].author.display_name).toBe('Renamed');
    expect(displayed.comments[0].content).toBe('Original body');
    expect(displayed.comments).toHaveLength(1);
    expect(displayed.resolved).toBe(false);
    expect(displayed.anchor).toBeNull();
    expect(displayed.mention_display_names).toEqual({
      mentioned: 'Frozen mention',
    });
    expect(original.creator.display_name).toBe('Original');
  });

  it('coalesces repeated refreshes, rejects obsolete responses and bounds request concurrency', async () => {
    const rows = Array.from({ length: 9 }, (_, i) => thread(String(i)));
    const pending = rows
      .slice(0, 4)
      .map(() => deferred<ResourceCommentThread>());
    let active = 0;
    let maximum = 0;
    let calls = 0;
    jest
      .mocked(getResourceCommentThread)
      .mockImplementation(async (_ns, _resource, id) => {
        active += 1;
        maximum = Math.max(maximum, active);
        const call = calls++;
        try {
          return call < 4 ? await pending[call].promise : thread(id, 'Newest');
        } finally {
          active -= 1;
        }
      });
    await render({ rows });
    await refresh();
    expect(calls).toBe(4);
    await act(async () => {
      window.dispatchEvent(new CustomEvent(USER_UPDATED_EVENT));
      window.dispatchEvent(new Event('focus'));
    });
    expect(calls).toBe(4);
    await act(async () =>
      pending.forEach((item, i) => item.resolve(thread(String(i), 'Obsolete')))
    );
    expect(maximum).toBe(4);
    expect(calls).toBe(13);
    for (const row of rows)
      expect(identity.withIdentity(row).creator.display_name).toBe('Newest');
  });

  it('refreshes identities for a page loaded while an older refresh was pending', async () => {
    const first = thread('first');
    const next = thread('next');
    const pending = deferred<ResourceCommentThread>();
    jest.mocked(getResourceCommentThread).mockReturnValueOnce(pending.promise);
    await render({ rows: [first] });
    await refresh();
    await render({ rows: [first, next] });
    await act(async () => pending.resolve(thread('first', 'Obsolete')));
    expect(identity.withIdentity(next).creator.display_name).toBe('Current');
    expect(identity.withIdentity(first).creator.display_name).toBe('Current');
  });

  it('drops in-flight identity snapshots after local edits or deletion', async () => {
    const edited = thread('edited');
    const deleted = thread('deleted');
    const first = deferred<ResourceCommentThread>();
    const second = deferred<ResourceCommentThread>();
    jest
      .mocked(getResourceCommentThread)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    await render({ rows: [edited, deleted] });
    await refresh();
    versions.set('edited', 1);
    versions.set('deleted', 1);
    await act(async () => {
      first.resolve(thread('edited', 'Obsolete'));
      second.resolve(thread('deleted', 'Obsolete'));
    });
    expect(identity.withIdentity(edited)).toBe(edited);
    expect(identity.withIdentity(deleted)).toBe(deleted);
  });

  it('invalidates an already applied identity snapshot after a local mutation', async () => {
    const original = thread('one');
    await render({ rows: [original] });
    await refresh();
    expect(identity.withIdentity(original).creator.display_name).toBe(
      'Current'
    );
    versions.set('one', 1);
    const updated = thread('one', 'Saved name');
    await render({ rows: [updated] });
    expect(identity.withIdentity(updated)).toBe(updated);
  });

  it('ignores old resource responses after switching away and back', async () => {
    const original = thread('one');
    const pending = deferred<ResourceCommentThread>();
    jest.mocked(getResourceCommentThread).mockReturnValueOnce(pending.promise);
    await render({ rows: [original] });
    await refresh();
    await render({ rows: [thread('other')], resourceId: 'other' });
    await render({ rows: [original] });
    await refresh();
    await act(async () => pending.resolve(thread('one', 'Obsolete')));
    expect(identity.withIdentity(original).creator.display_name).toBe(
      'Current'
    );
  });

  it('preserves existing display data when resource and thread refreshes fail', async () => {
    const original = thread('one');
    await render({ rows: [original] });
    await refresh();
    jest.mocked(http.get).mockRejectedValue(new Error('Unavailable'));
    jest
      .mocked(getResourceCommentThread)
      .mockRejectedValue(new Error('Unavailable'));
    await refresh();
    expect(identity.names).toEqual({ mentioned: 'Current mention' });
    expect(identity.withIdentity(original).creator.display_name).toBe(
      'Current'
    );
  });

  it('refreshes member-name changes and uses the existing public-share routes', async () => {
    const original = thread('one');
    await render({ rows: [original], namespaceId: 'share:public' });
    await render({
      rows: [original],
      namespaceId: 'share:public',
      memberNamesKey: 'renamed',
    });
    expect(http.get).toHaveBeenCalledWith('/shares/public/resources/resource', {
      mute: true,
    });
    expect(getResourceCommentThread).toHaveBeenCalledWith(
      'share:public',
      'resource',
      'one'
    );
    expect(identity.withIdentity(original).creator.display_name).toBe(
      'Current'
    );
  });
});
