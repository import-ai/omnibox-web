/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { ConversationDetail } from '@/page/chat/core/types/conversation';

import {
  clearConversationCache,
  getCachedConversation,
  setCachedConversation,
} from './conversationCache';
import useContext from './useContext';

const mockGet = jest.fn();
const mockFire = jest.fn();
const mockResumeStart = jest.fn();

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire: mockFire }),
}));

jest.mock('@/const', () => ({ FORCE_ASK: false }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'zh' } }),
}));

jest.mock('@/lib/request', () => ({
  http: { get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock('@/lib/wizardLang', () => ({ getWizardLang: () => 'zh' }));

jest.mock('@/page/chat/ChatRouteParamsContext', () => ({
  useChatRouteParams: () => ({
    conversationId: 'conversation-a',
    namespaceId: 'namespace-a',
  }),
}));

jest.mock('@/page/chat/useSelectedResources.ts', () => ({
  __esModule: true,
  default: () => ({
    selectedResources: [],
    setSelectedResources: jest.fn(),
  }),
}));

jest.mock('@/page/chat/core/messageOperator.ts', () => ({
  createMessageOperator: () => ({}),
}));

jest.mock('@/page/chat/conversation/utils.ts', () => ({
  ask: jest.fn(),
  extractOriginalMessageSettings: jest.fn(),
  findFirstMessageWithMissingParent: () => undefined,
  getStreamEventId: jest.fn(),
  isTerminalMessageStatus: () => true,
  resumeStream: () => ({
    cancel: jest.fn(),
    destroy: jest.fn(),
    start: mockResumeStart,
  }),
  stopStream: jest.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const cacheScope = { userId: 'user-a', namespaceId: 'namespace-a' };

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function cachedConversation(): ConversationDetail {
  return {
    id: 'conversation-a',
    current_node: 'message-a',
    mapping: {
      'message-a': {
        id: 'message-a',
        parent_id: '',
        children: [],
        status: 'completed',
        message: { role: 'user', content: 'User A secret' },
      },
    },
  } as ConversationDetail;
}

function ConversationProbe({
  onContent,
}: {
  onContent: (text: string) => void;
}) {
  const context = useContext();
  onContent(
    context.messages
      .map(message => String(message.message.content || ''))
      .join('')
  );
  return null;
}

describe('useContext conversation cache failures', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.setItem('uid', 'user-a');
    sessionStorage.clear();
    clearConversationCache();
    mockGet.mockReset();
    mockFire.mockReset();
    mockResumeStart.mockReset();
    mockResumeStart.mockResolvedValue(undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    clearConversationCache();
  });

  it('clears cached messages when conversation authorization fails', async () => {
    setCachedConversation(cacheScope, cachedConversation());
    let rejectLoad!: (reason: unknown) => void;
    const loadPromise = new Promise<ConversationDetail>((_, reject) => {
      rejectLoad = reject;
    });
    mockGet.mockReturnValue(loadPromise);
    let content = '';

    await act(async () => {
      root.render(<ConversationProbe onContent={value => (content = value)} />);
    });
    expect(content).toBe('User A secret');

    await act(async () => {
      rejectLoad({ response: { status: 403 } });
      await loadPromise.catch(() => undefined);
      await Promise.resolve();
    });

    expect(content).toBe('');
    expect(getCachedConversation(cacheScope, 'conversation-a')).toBeUndefined();
    expect(mockFire).toHaveBeenCalledWith('chat:title:clear', {
      conversationId: 'conversation-a',
    });
  });

  it('clears unverified cached messages when the initial load is offline', async () => {
    setCachedConversation(cacheScope, cachedConversation());
    mockGet.mockRejectedValueOnce(new Error('offline'));
    let content = '';

    await act(async () => {
      root.render(<ConversationProbe onContent={value => (content = value)} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(content).toBe('');
    expect(getCachedConversation(cacheScope, 'conversation-a')).toBeUndefined();
  });

  it('clears visible messages when a 401 removes credentials before rejection', async () => {
    const load = deferred<ConversationDetail>();
    setCachedConversation(cacheScope, cachedConversation());
    mockGet.mockReturnValueOnce(load.promise);
    let content = '';

    await act(async () => {
      root.render(<ConversationProbe onContent={value => (content = value)} />);
    });
    expect(content).toBe('User A secret');
    localStorage.removeItem('uid');
    await act(async () => {
      load.reject({ response: { status: 401 } });
      await load.promise.catch(() => undefined);
      await Promise.resolve();
    });

    expect(content).toBe('');
    expect(getCachedConversation(cacheScope, 'conversation-a')).toBeUndefined();
  });

  it('ignores a conversation response after the authenticated user changes', async () => {
    let resolveLoad!: (conversation: ConversationDetail) => void;
    const loadPromise = new Promise<ConversationDetail>(resolve => {
      resolveLoad = resolve;
    });
    mockGet.mockReturnValue(loadPromise);
    let content = '';

    await act(async () => {
      root.render(<ConversationProbe onContent={value => (content = value)} />);
    });
    localStorage.setItem('uid', 'user-b');

    await act(async () => {
      resolveLoad(cachedConversation());
      await loadPromise;
      await Promise.resolve();
    });

    expect(content).toBe('');
    expect(getCachedConversation(cacheScope, 'conversation-a')).toBeUndefined();
    expect(mockResumeStart).not.toHaveBeenCalled();
  });

  it('hides mounted conversation state as soon as the user scope changes', async () => {
    setCachedConversation(cacheScope, cachedConversation());
    mockGet.mockReturnValue(new Promise(() => undefined));
    let content = '';
    const renderProbe = () =>
      root.render(<ConversationProbe onContent={value => (content = value)} />);

    await act(async () => {
      renderProbe();
    });
    expect(content).toBe('User A secret');

    localStorage.setItem('uid', 'user-b');
    await act(async () => {
      renderProbe();
    });

    expect(content).toBe('');
  });

  it('keeps a loaded conversation when the refresh request has a transient failure', async () => {
    const initialLoad = deferred<ConversationDetail>();
    const resume = deferred<void>();
    const refresh = deferred<ConversationDetail>();
    mockGet
      .mockReturnValueOnce(initialLoad.promise)
      .mockReturnValueOnce(refresh.promise);
    mockResumeStart.mockReturnValueOnce(resume.promise);
    let content = '';

    await act(async () => {
      root.render(<ConversationProbe onContent={value => (content = value)} />);
    });
    await act(async () => {
      initialLoad.resolve(cachedConversation());
      await initialLoad.promise;
      await Promise.resolve();
    });
    expect(content).toBe('User A secret');

    await act(async () => {
      resume.resolve();
      await resume.promise;
      await Promise.resolve();
    });
    await act(async () => {
      refresh.reject({ response: { status: 500 } });
      await refresh.promise.catch(() => undefined);
      await Promise.resolve();
    });

    expect(content).toBe('User A secret');
    expect(getCachedConversation(cacheScope, 'conversation-a')).toBeDefined();
    expect(mockFire).not.toHaveBeenCalledWith('chat:title:clear', {
      conversationId: 'conversation-a',
    });
  });

  it('clears a loaded conversation when the refresh request loses authorization', async () => {
    const initialLoad = deferred<ConversationDetail>();
    const resume = deferred<void>();
    const refresh = deferred<ConversationDetail>();
    mockGet
      .mockReturnValueOnce(initialLoad.promise)
      .mockReturnValueOnce(refresh.promise);
    mockResumeStart.mockReturnValueOnce(resume.promise);
    let content = '';

    await act(async () => {
      root.render(<ConversationProbe onContent={value => (content = value)} />);
    });
    await act(async () => {
      initialLoad.resolve(cachedConversation());
      await initialLoad.promise;
      await Promise.resolve();
    });
    await act(async () => {
      resume.resolve();
      await resume.promise;
      await Promise.resolve();
    });
    await act(async () => {
      refresh.reject({ response: { status: 403 } });
      await refresh.promise.catch(() => undefined);
      await Promise.resolve();
    });

    expect(content).toBe('');
    expect(getCachedConversation(cacheScope, 'conversation-a')).toBeUndefined();
  });

  it('clears unchanged cached data when a destroyed request loses authorization', async () => {
    const load = deferred<ConversationDetail>();
    setCachedConversation(cacheScope, cachedConversation());
    mockGet.mockReturnValueOnce(load.promise);

    await act(async () => {
      root.render(<ConversationProbe onContent={() => undefined} />);
    });
    await act(async () => root.render(null));
    await act(async () => {
      load.reject({ response: { status: 403 } });
      await load.promise.catch(() => undefined);
      await Promise.resolve();
    });

    expect(getCachedConversation(cacheScope, 'conversation-a')).toBeUndefined();
  });

  it('does not let a destroyed request clear newer cached data', async () => {
    const load = deferred<ConversationDetail>();
    setCachedConversation(cacheScope, cachedConversation());
    mockGet.mockReturnValueOnce(load.promise);

    await act(async () => {
      root.render(<ConversationProbe onContent={() => undefined} />);
    });
    await act(async () => root.render(null));
    setCachedConversation(cacheScope, {
      ...cachedConversation(),
      title: 'Newer conversation',
    });
    await act(async () => {
      load.reject({ response: { status: 403 } });
      await load.promise.catch(() => undefined);
      await Promise.resolve();
    });

    expect(getCachedConversation(cacheScope, 'conversation-a')?.title).toBe(
      'Newer conversation'
    );
  });
});
