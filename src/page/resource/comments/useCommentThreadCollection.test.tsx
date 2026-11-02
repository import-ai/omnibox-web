/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { ResourceDocumentCommentThread } from '@/interface';
import { listResourceCommentThreads } from '@/service/resourceComments';

import { useCommentThreadCollection } from './useCommentThreadCollection';

jest.mock('@/service/resourceComments', () => ({
  listResourceCommentThreads: jest.fn(),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const onThreads = jest.fn();
function documentThread(
  index: number,
  resolved = false
): ResourceDocumentCommentThread {
  return {
    id: String(index).padStart(2, '0'),
    type: 'document',
    anchor: null,
    quoted_text: '',
    resolved,
    creator: { id: 'author', username: 'Author' },
    comments: [],
    created_at: '2026-10-21T00:00:00Z',
    updated_at: '2026-10-21T00:00:00Z',
  };
}
let collection: ReturnType<typeof useCommentThreadCollection>;
function Fixture({ resourceId = 'resource' }: { resourceId?: string }) {
  collection = useCommentThreadCollection({
    namespaceId: 'namespace',
    resourceId,
    view: 'document',
    resolved: false,
    enabled: true,
    onThreads,
  });
  return null;
}

describe('server comment pagination cursor', () => {
  let root: Root;
  let database: ResourceDocumentCommentThread[];
  beforeEach(() => {
    root = createRoot(document.createElement('div'));
    database = Array.from({ length: 25 }, (_, index) => documentThread(index));
    jest
      .mocked(listResourceCommentThreads)
      .mockImplementation(async (_namespace, _resource, options) => {
        const filtered = database
          .filter(thread => thread.resolved === options?.resolved)
          .sort((left, right) => left.id.localeCompare(right.id));
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? 20;
        return {
          items: filtered.slice(offset, offset + limit),
          total: filtered.length,
          offset,
          limit,
          has_more: offset + limit < filtered.length,
        };
      });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    jest.clearAllMocks();
  });
  const render = async () => {
    await act(async () => root.render(<Fixture />));
  };

  it.each(['delete', 'resolve'])(
    'does not skip the next server row after a loaded %s',
    async action => {
      await render();
      const previous = database[5];
      if (action === 'delete') {
        database = database.filter(thread => thread.id !== previous.id);
        await act(async () => collection.remove(previous.id, previous));
      } else {
        const updated = { ...previous, resolved: true };
        database = database.map(thread =>
          thread.id === previous.id ? updated : thread
        );
        await act(async () => collection.put(updated, previous));
      }
      await act(async () => collection.load(true));
      expect(listResourceCommentThreads).toHaveBeenLastCalledWith(
        'namespace',
        'resource',
        { view: 'document', resolved: false, offset: 19, limit: 20 }
      );
      expect(collection.threads.map(thread => thread.id)).toEqual(
        database.filter(thread => !thread.resolved).map(thread => thread.id)
      );
      expect(collection.total).toBe(24);
    }
  );

  it('advances past a reopened earlier document already merged into the loaded page', async () => {
    const previous = documentThread(-1, true);
    database.unshift(previous);
    await render();
    const updated = { ...previous, resolved: false };
    database[0] = updated;
    await act(async () => collection.put(updated, previous));
    await act(async () => collection.load(true));
    expect(listResourceCommentThreads).toHaveBeenLastCalledWith(
      'namespace',
      'resource',
      { view: 'document', resolved: false, offset: 21, limit: 20 }
    );
    expect(collection.threads).toHaveLength(26);
    expect(collection.threads[0].id).toBe('-1');
  });

  it('does not move the cursor for a new comment or an injected later target', async () => {
    await render();
    const target = database[24];
    await act(async () => collection.put(target));
    expect(collection.total).toBe(25);
    database = database.filter(thread => thread.id !== target.id);
    await act(async () => collection.remove(target.id, target));
    const created = documentThread(26);
    database.push(created);
    await act(async () => collection.put(created, undefined, true));
    await act(async () => collection.load(true));
    expect(listResourceCommentThreads).toHaveBeenLastCalledWith(
      'namespace',
      'resource',
      { view: 'document', resolved: false, offset: 20, limit: 20 }
    );
    expect(collection.threads.map(thread => thread.id)).toEqual(
      database.map(thread => thread.id)
    );
  });

  it('reloads a page raced by a successful mutation without undoing that mutation', async () => {
    await render();
    let finish!: (
      value: Awaited<ReturnType<typeof listResourceCommentThreads>>
    ) => void;
    jest.mocked(listResourceCommentThreads).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    let pending!: Promise<void>;
    await act(async () => {
      pending = collection.load(true);
    });
    const previous = database[5];
    database = database.filter(thread => thread.id !== previous.id);
    await act(async () => collection.remove(previous.id, previous));
    await act(async () => {
      finish({
        items: [documentThread(20)],
        total: 25,
        offset: 20,
        limit: 20,
        has_more: true,
      });
      await pending;
    });
    expect(collection.total).toBe(24);
    expect(collection.threads.some(thread => thread.id === '05')).toBe(false);
    await act(async () => collection.load(true));
    expect(collection.threads.map(thread => thread.id)).toEqual(
      database.map(thread => thread.id)
    );
  });

  it('retains a permalink injected while its first server page is still loading', async () => {
    let finish!: (
      value: Awaited<ReturnType<typeof listResourceCommentThreads>>
    ) => void;
    jest.mocked(listResourceCommentThreads).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await render();
    await act(async () => collection.put(database[24]));
    await act(async () =>
      finish({
        items: database.slice(0, 20),
        total: 25,
        offset: 0,
        limit: 20,
        has_more: true,
      })
    );
    expect(collection.threads.some(thread => thread.id === '24')).toBe(true);
    expect(collection.total).toBe(25);
    await act(async () => collection.load(true));
    expect(listResourceCommentThreads).toHaveBeenLastCalledWith(
      'namespace',
      'resource',
      { view: 'document', resolved: false, offset: 20, limit: 20 }
    );
    expect(collection.threads).toHaveLength(25);
  });

  it('accepts a fresh server row when a previously injected target appears on a later page', async () => {
    await render();
    await act(async () => collection.put(database[24]));
    const updated = {
      ...database[24],
      comments: [
        {
          id: 'comment',
          content: 'Updated by collaborator',
          author: { id: 'author', username: 'Author' },
          created_at: '2026-10-21T00:00:00Z',
          updated_at: '2026-10-21T01:00:00Z',
        },
      ],
    };
    database[24] = updated;
    await act(async () => collection.load(true));
    expect(
      collection.threads.find(thread => thread.id === '24')?.comments[0]
        ?.content
    ).toBe('Updated by collaborator');
  });

  it('preserves a fresh target injected during an older page request containing the same row', async () => {
    let finish!: (
      value: Awaited<ReturnType<typeof listResourceCommentThreads>>
    ) => void;
    jest.mocked(listResourceCommentThreads).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await render();
    const updated = { ...database[0], resolved: true };
    await act(async () => collection.put(updated));
    await act(async () =>
      finish({
        items: database.slice(0, 20),
        total: 25,
        offset: 0,
        limit: 20,
        has_more: true,
      })
    );
    expect(collection.threads.some(thread => thread.id === '00')).toBe(false);
  });

  it('does not replace a successful creation with an older initial response', async () => {
    let finish!: (
      value: Awaited<ReturnType<typeof listResourceCommentThreads>>
    ) => void;
    jest.mocked(listResourceCommentThreads).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await render();
    const created = documentThread(26);
    database.push(created);
    await act(async () => collection.put(created, undefined, true));
    await act(async () =>
      finish({
        items: database.slice(0, 20),
        total: 25,
        offset: 0,
        limit: 20,
        has_more: true,
      })
    );
    expect(collection.threads.some(thread => thread.id === created.id)).toBe(
      true
    );
    expect(collection.total).toBe(26);
    await act(async () => collection.load(true));
    expect(collection.threads).toHaveLength(26);
  });

  it('does not resurrect a resolved off-page target from an older load-more response', async () => {
    await render();
    const previous = database[24];
    await act(async () => collection.put(previous));
    let finish!: (
      value: Awaited<ReturnType<typeof listResourceCommentThreads>>
    ) => void;
    jest.mocked(listResourceCommentThreads).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    let pending!: Promise<void>;
    await act(async () => {
      pending = collection.load(true);
    });
    const stalePage = database.slice(20);
    const updated = { ...previous, resolved: true };
    database[24] = updated;
    await act(async () => collection.put(updated, previous));
    await act(async () => {
      finish({
        items: stalePage,
        total: 25,
        offset: 20,
        limit: 20,
        has_more: false,
      });
      await pending;
    });
    expect(collection.threads.some(thread => thread.id === previous.id)).toBe(
      false
    );
    expect(collection.total).toBe(24);
    await act(async () => collection.load(true));
    expect(collection.threads).toHaveLength(24);
  });

  it('ignores a response from a previous resource scope', async () => {
    let finish!: (
      value: Awaited<ReturnType<typeof listResourceCommentThreads>>
    ) => void;
    jest.mocked(listResourceCommentThreads).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await render();
    const stalePage = database.slice(0, 20);
    database = [documentThread(99)];
    await act(async () => root.render(<Fixture resourceId={'other'} />));
    await act(async () =>
      finish({
        items: stalePage,
        total: 25,
        offset: 0,
        limit: 20,
        has_more: true,
      })
    );
    expect(collection.threads.map(thread => thread.id)).toEqual(['99']);
    expect(collection.total).toBe(1);
  });
});
