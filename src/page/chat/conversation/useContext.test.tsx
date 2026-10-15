/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { setPendingChatPayload } from '@/lib/chatBridge';
import { ChatMode } from '@/page/chat/chat-input/types';
import type { ConversationDetail } from '@/page/chat/core/types/conversation';

import {
  clearConversationCache,
  getCachedConversation,
  setCachedConversation,
} from './conversationCache';
import * as imageUploads from './uploadConversationImages';
import useContext from './useContext';
import { resetConversationBootstrapState } from './useConversationBootstrap';
import { ask, extractOriginalMessageSettings } from './utils';

const mockGet = jest.fn();
const mockFire = jest.fn();
const mockResumeStart = jest.fn();

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire: mockFire }),
}));

jest.mock('react-router-dom', () => ({ useParams: () => ({}) }));

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
  createMessageOperator: () => ({ error: jest.fn() }),
}));

jest.mock('@/page/chat/conversation/utils.ts', () => ({
  ask: jest.fn(),
  beginPendingQuery: jest.fn(() => 'pending-query'),
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
    resetConversationBootstrapState();
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

  it('blocks composer while history is unresolved and enables a hydrated empty conversation', async () => {
    const load = deferred<ConversationDetail>();
    mockGet.mockReturnValue(load.promise);
    let context!: ReturnType<typeof useContext>;
    function Probe() {
      context = useContext();
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    expect(context.loading).toBe(true);
    await act(async () => {
      load.resolve({ id: 'conversation-a', mapping: {}, total: 0 });
      await load.promise;
    });
    expect(context.loading).toBe(false);
  });

  it('retains attached images and original strength when editing the user query', async () => {
    const conversation = cachedConversation();
    conversation.mapping['message-a'].attrs = {
      edition: 'pro',
      level: 'max',
      composer: {
        display_parts: [
          {
            type: 'image',
            attachment_id: 'att-1',
            name: 'image.png',
            preview_url: '/preview/att-1',
          },
        ],
      },
    };
    setCachedConversation(cacheScope, conversation);
    mockGet.mockResolvedValue(conversation);
    jest.mocked(extractOriginalMessageSettings).mockReturnValue({
      originalTools: [],
      originalContext: [],
      originalLang: '简体中文',
      originalEnableThinking: false,
    });
    jest.mocked(ask).mockReturnValue({
      cancel: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
    });
    let context!: ReturnType<typeof useContext>;
    function EditProbe() {
      context = useContext();
      return null;
    }
    await act(async () => {
      root.render(<EditProbe />);
    });
    await act(async () => {
      await context.onEdit('message-a', 'Updated query');
    });
    expect(jest.mocked(ask).mock.calls.at(-1)?.[17]).toEqual([
      { attachment_id: 'att-1', name: 'image.png', url: '/preview/att-1' },
    ]);
    expect(jest.mocked(ask).mock.calls.at(-1)?.slice(-2)).toEqual([
      'pro',
      'max',
    ]);
  });

  it('retries the original file and query ID after an image upload fails', async () => {
    const conversation = cachedConversation();
    setCachedConversation(cacheScope, conversation);
    mockGet.mockResolvedValue(conversation);
    const upload = jest
      .spyOn(imageUploads, 'resolveConversationImages')
      .mockRejectedValueOnce(new Error('upload offline'))
      .mockResolvedValueOnce([
        { attachment_id: 'uploaded', name: 'image.png', url: '/preview' },
      ]);
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    const images = [
      { id: 'local-image', name: file.name, file, url: 'blob:preview' },
    ];
    jest.mocked(ask).mockReturnValue({
      cancel: jest.fn(),
      destroy: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
    });
    let context!: ReturnType<typeof useContext>;
    function Probe() {
      context = useContext();
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    await act(async () => {
      await context.sendMessage({
        query: 'image query',
        tools: [],
        selectedResources: [],
        mode: ChatMode.ASK,
        images,
      });
    });
    await act(async () => {
      await context.onEdit('pending-query', 'image query');
    });
    expect(upload).toHaveBeenNthCalledWith(
      2,
      'namespace-a',
      'conversation-a',
      images
    );
    expect(jest.mocked(ask).mock.calls.at(-1)?.[18]).toBe('pending-query');
    expect(jest.mocked(ask).mock.calls.at(-1)?.[17]?.[0].attachment_id).toBe(
      'uploaded'
    );
    upload.mockRestore();
  });

  it('reloads the reply after leaving a new conversation before it finishes', async () => {
    setPendingChatPayload('conversation-a', {
      query: '你好',
      tools: [],
      selectedResources: [],
      mode: ChatMode.ASK,
    });
    let releaseStream!: () => void;
    const started = new Promise<void>(resolve => {
      releaseStream = resolve;
    });
    const destroy = jest.fn(() => releaseStream());
    jest.mocked(ask).mockReturnValue({
      cancel: jest.fn(),
      destroy,
      start: () => started,
    });
    mockGet.mockResolvedValue({ id: 'conversation-a', mapping: {}, total: 0 });
    function Probe() {
      useContext();
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(jest.mocked(ask)).toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
    expect(destroy).toHaveBeenCalled();

    root = createRoot(container);
    const clientLeafId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    setCachedConversation(cacheScope, {
      id: 'conversation-a',
      current_node: clientLeafId,
      mapping: {
        [clientLeafId]: {
          id: clientLeafId,
          parent_id: '',
          children: [],
          status: 'pending',
          message: { role: 'user', content: '你好' },
        },
      },
    } as ConversationDetail);
    mockGet.mockClear();
    mockResumeStart.mockClear();
    mockGet.mockResolvedValue({
      id: 'conversation-a',
      title: '',
      current_node: 'assistant-1',
      mapping: {
        'user-1': {
          id: 'user-1',
          parent_id: '',
          children: ['assistant-1'],
          status: 'success',
          message: { role: 'user', content: '你好' },
        },
        'assistant-1': {
          id: 'assistant-1',
          parent_id: 'user-1',
          children: [],
          status: 'streaming',
          message: { role: 'assistant', content: '在的' },
        },
      },
    });
    await act(async () => {
      root.render(<Probe />);
    });
    expect(mockGet).toHaveBeenCalledWith(
      '/namespaces/namespace-a/conversations/conversation-a/messages',
      { params: {} }
    );
    expect(
      mockGet.mock.calls.some(
        call => call[1]?.params?.branch_leaf_id === clientLeafId
      )
    ).toBe(false);
    expect(mockResumeStart).toHaveBeenCalled();
  });

  it('publishes the first message text for the sidebar and clears it when sending fails', async () => {
    mockGet.mockResolvedValue({ id: 'conversation-a', mapping: {}, total: 0 });
    jest.mocked(ask).mockReturnValue({
      cancel: jest.fn(),
      destroy: jest.fn(),
      start: jest.fn().mockRejectedValue(new Error('offline')),
    });
    let context!: ReturnType<typeof useContext>;
    function Probe() {
      context = useContext();
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    await act(async () => {
      await context.sendMessage({
        query: '  [web_search](tool://web_search)\n你好  ',
        tools: [],
        selectedResources: [],
        mode: ChatMode.ASK,
      });
    });
    expect(mockFire).toHaveBeenCalledWith(
      'chat:conversation:provisional',
      expect.objectContaining({
        userId: 'user-a',
        namespaceId: 'namespace-a',
        conversation: expect.objectContaining({
          id: 'conversation-a',
          title: '你好',
        }),
      })
    );
    expect(mockFire).toHaveBeenCalledWith(
      'chat:conversation:provisional',
      expect.objectContaining({
        userId: 'user-a',
        namespaceId: 'namespace-a',
        clearId: 'conversation-a',
      })
    );
    expect(mockFire).not.toHaveBeenCalledWith(
      'chat:title:update',
      expect.anything()
    );
  });

  it('does not replace an existing conversation title with a later message', async () => {
    const conversation = cachedConversation();
    conversation.title = '简短问候';
    setCachedConversation(cacheScope, conversation);
    mockGet.mockResolvedValue(conversation);
    jest.mocked(ask).mockReturnValue({
      cancel: jest.fn(),
      destroy: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
    });
    let context!: ReturnType<typeof useContext>;
    function Probe() {
      context = useContext();
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    mockFire.mockClear();
    await act(async () => {
      await context.sendMessage({
        query: '再问一句',
        tools: [],
        selectedResources: [],
        mode: ChatMode.ASK,
      });
    });
    expect(mockFire).not.toHaveBeenCalledWith(
      'chat:conversation:provisional',
      expect.anything()
    );
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
