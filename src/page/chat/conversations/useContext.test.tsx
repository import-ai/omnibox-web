/** @jest-environment jsdom */
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import {
  rememberProvisionalConversation,
  resetProvisionalConversations,
} from './provisionalConversation';
import useContext from './useContext';

const mockListeners = new Map<string, (payload: unknown) => void>();
const mockApp = {
  on: (event: string, listener: (payload: unknown) => void) => {
    mockListeners.set(event, listener);
    return () => mockListeners.delete(event);
  },
  fire: (event: string, payload: unknown) => {
    mockListeners.get(event)?.(payload);
  },
};

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-router-dom', () => ({ useParams: () => ({}) }));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const get = jest.mocked(http.get);
let currentContext: ReturnType<typeof useContext> | undefined;
let container: HTMLDivElement;
let root: Root;

function Probe({ compact = true }: { compact?: boolean }) {
  currentContext = useContext('space', compact);
  return null;
}

function context() {
  if (!currentContext) {
    throw new Error('Conversation hook has not mounted');
  }
  return currentContext;
}

function page(start: number, count: number, total = 25) {
  return {
    total,
    data: Array.from({ length: count }, (_, index) => ({
      id: `chat-${start + index}`,
      title: `Chat ${start + index}`,
    })),
  };
}

beforeEach(() => {
  get.mockReset();
  resetProvisionalConversations();
  localStorage.setItem('uid', 'user-a');
  currentContext = undefined;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

it('appends older chats once per request and stops at the end', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(10, 10));
  await act(async () => {
    context().list.onPagerChange(2);
    context().list.onPagerChange(2);
  });
  expect(context().list.data.data).toHaveLength(20);
  expect(context().list.data.data[0].id).toBe('chat-0');
  expect(context().list.data.data[19].id).toBe('chat-19');
  expect(get).toHaveBeenCalledTimes(4);
  expect(get.mock.calls[3][0]).toContain('offset=10&limit=10');

  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(20, 5));
  await act(async () => context().list.onPagerChange(2));
  expect(context().list.data.data).toHaveLength(25);
  expect(context().list.hasMore).toBe(false);
  await act(async () => context().list.onPagerChange(2));
  expect(get).toHaveBeenCalledTimes(6);
});

it('retains loaded chats on failure and retries the same offset', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  get
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error('Network error'));
  await act(async () => context().list.onPagerChange(2));
  expect(context().list.hasLoadError).toBe(true);
  expect(context().list.loading).toBe(false);
  expect(context().list.data.data).toHaveLength(10);
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(10, 10));
  await act(async () => context().list.onPagerChange(2));
  expect(get.mock.calls[5][0]).toContain('offset=10&limit=10');
  expect(context().list.hasLoadError).toBe(false);
  expect(context().list.data.data).toHaveLength(20);
});

it('refreshes the loaded range after a rename or deletion', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(10, 10));
  await act(async () => context().list.onPagerChange(2));
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(1, 20, 24));
  await act(async () => context().onRemoveDone());
  expect(get.mock.calls[5][0]).toContain('offset=0&limit=20');
  expect(context().list.data.data).toHaveLength(20);
  expect(context().list.data.data[0].id).toBe('chat-1');
});

it('keeps ordinary pagination on the standalone history page', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe compact={false} />));
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(10, 10));
  await act(async () => context().list.onPagerChange(2));
  expect(context().list.current).toBe(2);
  expect(context().list.data.data).toHaveLength(10);
  expect(context().list.data.data[0].id).toBe('chat-10');
});

it('shows a newly titled conversation and preserves the loaded range on refresh', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(10, 10));
  await act(async () => context().list.onPagerChange(2));

  const refreshedPage = page(0, 19, 26);
  refreshedPage.data.unshift({ id: 'new-chat', title: 'Generated title' });
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(refreshedPage);
  await act(async () => {
    mockApp.fire('chat:conversation:title-generated', {
      namespaceId: 'space',
      userId: 'user-a',
      conversation: {
        id: 'new-chat',
        title: 'Generated title',
        created_at: '2026-10-12T01:00:00Z',
      },
    });
  });

  expect(get.mock.calls[5][0]).toContain('offset=0&limit=20');
  expect(context().list.data.data).toEqual(refreshedPage.data);
  expect(context().list.data.total).toBe(26);
  expect(context().list.hasMore).toBe(true);
});

it('ignores refresh notifications for another namespace and unsubscribes on unmount', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  await act(async () => {
    mockApp.fire('chat:conversation:title-generated', {
      namespaceId: 'other-space',
      userId: 'user-a',
      conversation: {
        id: 'new-chat',
        title: 'Generated title',
        created_at: '2026-10-12T01:00:00Z',
      },
    });
  });
  expect(get).toHaveBeenCalledTimes(2);
  await act(async () => root.render(null));
  expect(mockListeners.has('chat:conversation:title-generated')).toBe(false);
});

it('shows the generated title before refresh completes and retains it through a stale response', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));

  let resolvePage: (value: ReturnType<typeof page>) => void = () => {
    throw new Error('Refresh request has not started');
  };
  const pendingPage = new Promise<ReturnType<typeof page>>(resolve => {
    resolvePage = resolve;
  });
  get.mockResolvedValueOnce({}).mockReturnValueOnce(pendingPage);
  const conversation = {
    id: 'new-chat',
    title: 'Generated title',
    created_at: '2026-10-12T01:00:00Z',
  };
  await act(async () => {
    mockApp.fire('chat:conversation:title-generated', {
      namespaceId: 'space',
      userId: 'user-a',
      conversation,
    });
  });

  expect(context().list.loading).toBe(true);
  expect(context().list.data.data[0]).toEqual(conversation);
  expect(context().list.data.total).toBe(26);

  await act(async () => resolvePage(page(0, 10)));
  expect(context().list.data.data[0]).toEqual(conversation);
  expect(context().list.data.total).toBe(26);

  const confirmedPage = page(0, 10, 26);
  confirmedPage.data.unshift(conversation);
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(confirmedPage);
  await act(async () => context().list.refetch());
  expect(context().list.data.data).toEqual(confirmedPage.data);
  expect(context().list.data.total).toBe(26);
});

it('updates an existing conversation without duplication or changing its total', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  const stalePage = page(0, 10);
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(stalePage);
  await act(async () => {
    mockApp.fire('chat:conversation:title-generated', {
      namespaceId: 'space',
      userId: 'user-a',
      conversation: {
        id: 'chat-0',
        title: 'Generated title',
        created_at: '2026-10-12T01:00:00Z',
      },
    });
  });
  expect(context().list.data.data[0].title).toBe('Generated title');
  expect(context().list.data.data).toHaveLength(10);
  expect(context().list.data.total).toBe(25);
});

it('ignores generated titles belonging to another user', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  await act(async () => {
    mockApp.fire('chat:conversation:title-generated', {
      namespaceId: 'space',
      userId: 'other-user',
      conversation: {
        id: 'new-chat',
        title: 'Other user title',
        created_at: '2026-10-12T01:00:00Z',
      },
    });
  });
  expect(get).toHaveBeenCalledTimes(2);
  expect(context().list.data.data).toHaveLength(10);
});

it('refreshes without marking the list as loading another page', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  expect(context().list.loadingMore).toBe(false);

  let resolvePage: (value: ReturnType<typeof page>) => void = () => {
    throw new Error('Refresh request has not started');
  };
  const pendingPage = new Promise<ReturnType<typeof page>>(resolve => {
    resolvePage = resolve;
  });
  get.mockResolvedValueOnce({}).mockReturnValueOnce(pendingPage);
  let refresh: Promise<void> | undefined;
  await act(async () => {
    refresh = context().list.refetch();
  });
  expect(context().list.loading).toBe(true);
  expect(context().list.loadingMore).toBe(false);
  expect(get.mock.calls.at(-1)?.[0]).toContain('offset=0&limit=10');

  await act(async () => {
    resolvePage(page(0, 10));
    await refresh;
  });
  expect(context().list.loading).toBe(false);
  expect(context().list.loadingMore).toBe(false);
});

it('retries a failed refresh in place and a failed page at the same offset', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  get
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error('refresh failed'));
  await act(async () => context().list.refetch());
  expect(context().list.hasLoadError).toBe(true);
  expect(context().list.loadingMore).toBe(false);

  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => context().list.retry());
  expect(get.mock.calls.at(-1)?.[0]).toContain('offset=0&limit=10');
  expect(context().list.hasLoadError).toBe(false);

  get.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('page failed'));
  await act(async () => context().list.onPagerChange(2));
  expect(context().list.loadingMore).toBe(false);
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(10, 10));
  await act(async () => context().list.retry());
  expect(get.mock.calls.at(-1)?.[0]).toContain('offset=10&limit=10');
});

it('shows the first message on an empty sidebar conversation without duplicating it', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce({
    total: 1,
    data: [
      { id: 'new-chat', title: '', created_at: '2026-10-14T01:40:00.000Z' },
    ],
  });
  await act(async () => root.render(<Probe />));
  await act(async () => {
    mockApp.fire('chat:conversation:provisional', {
      namespaceId: 'space',
      userId: 'user-a',
      conversation: {
        id: 'new-chat',
        title: '你好',
        created_at: '2026-10-14T01:49:00.000Z',
      },
    });
  });
  expect(context().list.data.data).toEqual([
    {
      id: 'new-chat',
      title: '你好',
      created_at: '2026-10-14T01:40:00.000Z',
    },
  ]);
  expect(context().list.data.total).toBe(1);
});

it('shows a provisional conversation remembered before the sidebar list mounts', async () => {
  rememberProvisionalConversation(
    { userId: 'user-a', namespaceId: 'space' },
    {
      id: 'new-chat',
      title: '你好',
      created_at: '2026-10-14T01:49:00.000Z',
    }
  );
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  expect(context().list.data.data[0]).toEqual({
    id: 'new-chat',
    title: '你好',
    created_at: '2026-10-14T01:49:00.000Z',
  });
  expect(context().list.data.total).toBe(26);
});

it('replaces the provisional message once the list returns a generated title', async () => {
  rememberProvisionalConversation(
    { userId: 'user-a', namespaceId: 'space' },
    {
      id: 'new-chat',
      title: '你好',
      created_at: '2026-10-14T01:49:00.000Z',
    }
  );
  get.mockResolvedValueOnce({}).mockResolvedValueOnce({
    total: 1,
    data: [
      { id: 'new-chat', title: '', created_at: '2026-10-14T01:40:00.000Z' },
    ],
  });
  await act(async () => root.render(<Probe />));
  expect(context().list.data.data[0].title).toBe('你好');

  get.mockResolvedValueOnce({}).mockResolvedValueOnce({
    total: 1,
    data: [
      {
        id: 'new-chat',
        title: '简短问候',
        created_at: '2026-10-14T01:40:00.000Z',
      },
    ],
  });
  await act(async () => context().list.refetch());
  expect(context().list.data.data[0].title).toBe('简短问候');

  get.mockResolvedValueOnce({}).mockResolvedValueOnce({
    total: 1,
    data: [
      { id: 'new-chat', title: '', created_at: '2026-10-14T01:40:00.000Z' },
    ],
  });
  await act(async () => context().list.refetch());
  expect(context().list.data.data[0].title).toBe('');
});

it('drops a failed send preview and keeps an existing empty conversation', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce({
    total: 1,
    data: [
      { id: 'new-chat', title: '', created_at: '2026-10-14T01:40:00.000Z' },
    ],
  });
  await act(async () => root.render(<Probe />));
  await act(async () => {
    mockApp.fire('chat:conversation:provisional', {
      namespaceId: 'space',
      userId: 'user-a',
      conversation: {
        id: 'new-chat',
        title: '你好',
        created_at: '2026-10-14T01:49:00.000Z',
      },
    });
  });
  expect(context().list.data.data[0].title).toBe('你好');
  await act(async () => {
    mockApp.fire('chat:conversation:provisional', {
      namespaceId: 'space',
      userId: 'user-a',
      clearId: 'new-chat',
    });
  });
  expect(context().list.data.data).toEqual([
    { id: 'new-chat', title: '', created_at: '2026-10-14T01:40:00.000Z' },
  ]);
});

it('removes a failed send that was only a provisional row', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 1, 1));
  await act(async () => root.render(<Probe />));
  await act(async () => {
    mockApp.fire('chat:conversation:provisional', {
      namespaceId: 'space',
      userId: 'user-a',
      conversation: {
        id: 'new-chat',
        title: '你好',
        created_at: '2026-10-14T01:49:00.000Z',
      },
    });
  });
  expect(context().list.data.data[0].id).toBe('new-chat');
  await act(async () => {
    mockApp.fire('chat:conversation:provisional', {
      namespaceId: 'space',
      userId: 'user-a',
      clearId: 'new-chat',
    });
  });
  expect(context().list.data.data.map(item => item.id)).toEqual(['chat-0']);
  expect(context().list.data.total).toBe(1);
});

it('ignores provisional conversations on the standalone history page', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe compact={false} />));
  await act(async () => {
    mockApp.fire('chat:conversation:provisional', {
      namespaceId: 'space',
      userId: 'user-a',
      conversation: {
        id: 'new-chat',
        title: '你好',
        created_at: '2026-10-14T01:49:00.000Z',
      },
    });
  });
  expect(context().list.data.data).toHaveLength(10);
  expect(context().list.data.data[0].id).toBe('chat-0');
});
