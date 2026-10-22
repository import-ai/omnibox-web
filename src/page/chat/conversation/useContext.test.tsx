/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { setPendingChatPayload } from '@/lib/chatBridge';
import { WEB_SEARCH_QUERY_TOKEN } from '@/page/chat/chat-input/composerQuery';
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
import {
  ask,
  extractOriginalMessageSettings,
  findFirstMessageWithMissingParent,
} from './utils';

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
  useTranslation: () => ({
    i18n: { language: 'zh', t: (key: string) => key },
  }),
}));

const mockToastError = jest.fn();
const mockToastInfo = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
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
  findFirstMessageWithMissingParent: jest.fn(() => undefined),
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
    jest
      .mocked(findFirstMessageWithMissingParent)
      .mockImplementation(() => undefined);
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
      outcome: { failed: false },
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

  it('rejects a pending decision before sending typed text after it', async () => {
    const conversation = cachedConversation();
    conversation.mapping['message-a'].attrs = { edition: 'pro', level: 'max' };
    conversation.mapping['message-a'].children = ['interrupt'];
    conversation.mapping.interrupt = {
      id: 'interrupt',
      parent_id: 'message-a',
      children: [],
      status: 'success',
      message: { role: 'assistant', content: '' },
      attrs: {
        tool_call: {
          status: 'pending',
          interrupts: [
            {
              name: 'create_resource',
              args: {},
              decisions: ['approve', 'reject'],
            },
            {
              name: 'create_resource',
              args: {},
              decisions: ['approve', 'reject'],
            },
          ],
        },
      },
    } as unknown as ConversationDetail['mapping'][string];
    conversation.current_node = 'interrupt';
    setCachedConversation(cacheScope, conversation);
    mockGet.mockResolvedValue(conversation);
    const run = (lastMessageId?: string) => ({
      outcome: { failed: false, lastMessageId },
      cancel: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
    });
    jest
      .mocked(ask)
      .mockReturnValueOnce(run('tool-2'))
      .mockReturnValueOnce(run('answer'));
    let context!: ReturnType<typeof useContext>;
    function Probe() {
      context = useContext();
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    jest.mocked(ask).mockClear();

    await act(async () => {
      await context.sendMessage({
        query: '用一句话介绍北京',
        tools: [],
        selectedResources: [],
        mode: ChatMode.ASK,
      });
    });

    const [rejectCall, askCall] = jest.mocked(ask).mock.calls;
    expect(rejectCall[1]).toBe('');
    expect(rejectCall[5]).toBe('interrupt');
    expect(rejectCall[13]?.decisions).toEqual([
      expect.objectContaining({ type: 'reject', end_turn: true }),
      expect.objectContaining({ type: 'reject', end_turn: true }),
    ]);
    expect(rejectCall.slice(19)).toEqual([
      'pro',
      'max',
      expect.objectContaining({ deferPendingInterrupt: false }),
    ]);
    expect(askCall[1]).toBe('用一句话介绍北京');
    expect(askCall[5]).toBe('tool-2');
    expect(askCall[21]).toEqual(
      expect.objectContaining({ deferPendingInterrupt: false })
    );
  });

  function pendingInterrupt(id: string, parentId: string) {
    return {
      id,
      parent_id: parentId,
      children: [],
      status: 'success',
      message: { role: 'assistant', content: '' },
      attrs: {
        tool_call: {
          status: 'pending',
          interrupts: [
            {
              name: 'create_resource',
              args: {},
              decisions: ['approve', 'reject'],
            },
          ],
        },
      },
    } as unknown as ConversationDetail['mapping'][string];
  }

  function askRun(
    outcome: object,
    start = jest.fn().mockResolvedValue(undefined)
  ) {
    return {
      outcome: { failed: false, ...outcome },
      cancel: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      start,
    };
  }

  async function renderContext() {
    let context!: ReturnType<typeof useContext>;
    function Probe() {
      context = useContext();
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    jest.mocked(ask).mockClear();
    return () => context;
  }

  const typed = {
    query: '用一句话介绍北京',
    tools: [],
    selectedResources: [],
    mode: ChatMode.ASK,
  };

  it('continues from an approval another client raised after the page loaded', async () => {
    const loaded = cachedConversation();
    loaded.mapping['message-a'].message.role = 'assistant' as never;
    setCachedConversation(cacheScope, loaded);
    const newer = {
      id: 'conversation-a',
      current_node: 'interrupt-x',
      mapping: {
        'question-q': {
          id: 'question-q',
          parent_id: 'message-a',
          children: ['interrupt-x'],
          status: 'success',
          message: { role: 'user', content: 'from the bot' },
        },
        'interrupt-x': pendingInterrupt('interrupt-x', 'question-q'),
      },
    };
    mockGet.mockImplementation((_url: string, config?: { params?: object }) =>
      Promise.resolve(
        config?.params && 'branch_node_id' in config.params ? newer : loaded
      )
    );
    jest
      .mocked(ask)
      .mockReturnValueOnce(askRun({ lastMessageId: 'tool-x' }))
      .mockReturnValueOnce(askRun({ lastMessageId: 'answer' }));
    const context = await renderContext();

    await act(async () => {
      await context().sendMessage(typed);
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/namespaces/namespace-a/conversations/conversation-a/messages',
      { params: { branch_node_id: 'message-a' }, mute: true }
    );
    const [rejectCall, askCall] = jest.mocked(ask).mock.calls;
    expect(rejectCall[5]).toBe('interrupt-x');
    expect(rejectCall[13]?.decisions).toHaveLength(1);
    expect(askCall[1]).toBe('用一句话介绍北京');
    expect(askCall[5]).toBe('tool-x');
  });

  // The server state after a rejection that reached the server although the
  // page saw an error: decision -> rejected tool result under the interrupt.
  function landedRejection() {
    const interrupt = pendingInterrupt('interrupt', 'message-a');
    interrupt.children = ['decision-r'];
    delete interrupt.attrs?.tool_call?.interrupts;
    return {
      id: 'conversation-a',
      current_node: 'tool-r',
      mapping: {
        interrupt,
        'decision-r': {
          id: 'decision-r',
          parent_id: 'interrupt',
          children: ['tool-r'],
          status: 'success',
          message: { role: 'user', content: '' },
        },
        'tool-r': {
          id: 'tool-r',
          parent_id: 'decision-r',
          children: [],
          status: 'success',
          message: { role: 'tool', content: 'rejected' },
        },
      },
    };
  }

  function pendingConversation() {
    const conversation = cachedConversation();
    conversation.mapping['message-a'].children = ['interrupt'];
    conversation.mapping.interrupt = pendingInterrupt('interrupt', 'message-a');
    conversation.current_node = 'interrupt';
    return conversation;
  }

  function serveBranchBelow(
    loaded: ConversationDetail,
    below: Record<string, object>
  ) {
    mockGet.mockImplementation(
      (_url: string, config?: { params?: { branch_node_id?: string } }) =>
        Promise.resolve(
          (config?.params?.branch_node_id &&
            below[config.params.branch_node_id]) ||
            loaded
        )
    );
  }

  it('keeps the text unsent when the rejection fails and syncs with the server', async () => {
    const conversation = pendingConversation();
    setCachedConversation(cacheScope, conversation);
    // The first sync finds the interrupt still pending; after the failure the
    // server shows that the rejection landed.
    let syncs = 0;
    mockGet.mockImplementation(
      (_url: string, config?: { params?: { branch_node_id?: string } }) =>
        Promise.resolve(
          config?.params?.branch_node_id === 'interrupt' && syncs++ > 0
            ? landedRejection()
            : conversation
        )
    );
    jest
      .mocked(ask)
      .mockReturnValueOnce(
        askRun({ failed: true, requestId: 'local-d', errorMessage: '503' })
      );
    mockToastError.mockClear();
    const context = await renderContext();
    mockGet.mockClear();

    let error: unknown;
    await act(async () => {
      await context()
        .sendMessage(typed)
        .catch(e => {
          error = e;
        });
    });

    expect(error).toEqual(expect.objectContaining({ stopped: false }));
    expect(jest.mocked(ask)).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith('chat.decision.reject_failed');
    expect(
      mockGet.mock.calls.filter(
        ([, config]) => config?.params?.branch_node_id === 'interrupt'
      )
    ).toHaveLength(2);
    expect(context().messages.at(-1)?.id).toBe('tool-r');
  });

  it('drops a card decision on an interrupt decided elsewhere and shows the server state', async () => {
    const conversation = pendingConversation();
    setCachedConversation(cacheScope, conversation);
    serveBranchBelow(conversation, { interrupt: landedRejection() });
    jest
      .mocked(ask)
      .mockReturnValueOnce(
        askRun({ failed: true, alreadyDecided: true, requestId: 'local-d' })
      );
    mockToastInfo.mockClear();
    const context = await renderContext();

    await act(async () => {
      await context().sendMessage({
        ...typed,
        query: '',
        decisions: [{ type: 'approve' }],
      });
    });

    expect(jest.mocked(ask)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(ask).mock.calls[0][21]).toEqual(
      expect.objectContaining({ reportAlreadyDecided: true })
    );
    expect(mockToastInfo).toHaveBeenCalledWith('chat.decision.already_decided');
    expect(context().messages.at(-1)?.id).toBe('tool-r');
  });

  it('sends typed text once from the server state when the interrupt was decided elsewhere', async () => {
    const conversation = pendingConversation();
    setCachedConversation(cacheScope, conversation);
    let syncs = 0;
    mockGet.mockImplementation(
      (_url: string, config?: { params?: { branch_node_id?: string } }) =>
        Promise.resolve(
          config?.params?.branch_node_id === 'interrupt' && syncs++ > 0
            ? landedRejection()
            : conversation
        )
    );
    jest
      .mocked(ask)
      .mockReturnValueOnce(
        askRun({ failed: true, alreadyDecided: true, requestId: 'local-d' })
      )
      .mockReturnValueOnce(askRun({ lastMessageId: 'answer' }));
    const context = await renderContext();

    await act(async () => {
      await context().sendMessage(typed);
    });

    const calls = jest.mocked(ask).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1][1]).toBe('用一句话介绍北京');
    expect(calls[1][5]).toBe('tool-r');
  });

  it('lets the rejection finish but drops the text when the user stops', async () => {
    const conversation = cachedConversation();
    conversation.mapping['message-a'].children = ['interrupt'];
    conversation.mapping.interrupt = pendingInterrupt('interrupt', 'message-a');
    conversation.current_node = 'interrupt';
    setCachedConversation(cacheScope, conversation);
    mockGet.mockResolvedValue(conversation);
    const rejection = deferred<void>();
    const run = askRun(
      { lastMessageId: 'tool-1' },
      jest.fn(() => rejection.promise)
    );
    jest.mocked(ask).mockReturnValueOnce(run);
    mockToastError.mockClear();
    const context = await renderContext();

    let sending!: Promise<void>;
    let error: unknown;
    await act(async () => {
      sending = context()
        .sendMessage(typed)
        .catch(e => {
          error = e;
        });
      await Promise.resolve();
    });
    await act(async () => {
      await context().onStop();
      rejection.resolve();
      await sending;
    });

    expect(run.cancel).not.toHaveBeenCalled();
    expect(error).toEqual(expect.objectContaining({ stopped: true }));
    expect(jest.mocked(ask)).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('sends a failed local message again under a server message with its strength', async () => {
    const conversation = cachedConversation();
    conversation.mapping['message-a'].message.role = 'assistant' as never;
    conversation.mapping['message-a'].children = ['local-1'];
    conversation.mapping['local-1'] = {
      id: 'local-1',
      parent_id: 'message-a',
      children: ['local-2'],
      status: 'failed',
      message: { role: 'user', content: 'first' },
      attrs: { client_request_id: 'local-1', pending_query: true },
    } as unknown as ConversationDetail['mapping'][string];
    conversation.mapping['local-2'] = {
      id: 'local-2',
      parent_id: 'local-1',
      children: [],
      status: 'failed',
      message: { role: 'user', content: 'second' },
      attrs: {
        client_request_id: 'local-2',
        pending_query: true,
        edition: 'pro',
        level: 'max',
      },
    } as unknown as ConversationDetail['mapping'][string];
    conversation.current_node = 'local-2';
    setCachedConversation(cacheScope, conversation);
    mockGet.mockResolvedValue(conversation);
    jest.mocked(extractOriginalMessageSettings).mockReturnValue({
      originalTools: [],
      originalContext: [],
      originalLang: '简体中文',
      originalEnableThinking: false,
    });
    jest.mocked(ask).mockReturnValue(askRun({}));
    const context = await renderContext();

    await act(async () => {
      await context().onEdit('local-2', 'second');
    });

    const call = jest.mocked(ask).mock.calls.at(-1)!;
    expect(call[5]).toBe('message-a');
    expect(call.slice(19, 21)).toEqual(['pro', 'max']);
  });

  it('asks new questions to follow the newest message and shows where they landed', async () => {
    const conversation = cachedConversation();
    conversation.mapping['message-a'].message.role = 'assistant' as never;
    setCachedConversation(cacheScope, conversation);
    const newer = {
      id: 'conversation-a',
      current_node: 'answer-2',
      branch_leaf_id: 'answer-2',
      mapping: {
        'message-a': conversation.mapping['message-a'],
        'question-2': {
          id: 'question-2',
          parent_id: 'message-a',
          children: ['answer-2'],
          status: 'success',
          message: { role: 'user', content: 'from another tab' },
        },
        'answer-2': {
          id: 'answer-2',
          parent_id: 'question-2',
          children: [],
          status: 'success',
          message: { role: 'assistant', content: 'answer' },
        },
      },
    };
    mockGet.mockImplementation(
      (_url: string, config?: { params?: { branch_leaf_id?: string } }) =>
        Promise.resolve(
          config?.params?.branch_leaf_id === 'answer-2' ? newer : conversation
        )
    );
    jest.mocked(ask).mockReturnValueOnce(askRun({ lastMessageId: 'answer' }));
    const context = await renderContext();

    await act(async () => {
      await context().sendMessage(typed);
    });
    const options = jest.mocked(ask).mock.calls[0][21]!;
    expect(options).toEqual(expect.objectContaining({ followLatest: true }));
    const before = context().conversation.current_node;
    await act(async () => {
      options.onReparented?.('answer-2');
      await Promise.resolve();
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/namespaces/namespace-a/conversations/conversation-a/messages',
      { params: { branch_leaf_id: 'answer-2' }, mute: true }
    );
    expect(context().conversation.mapping['answer-2']).toBeDefined();
    expect(context().conversation.current_node).toBe(before);
  });

  it('keeps edits and decisions on their own parent', async () => {
    const conversation = pendingConversation();
    setCachedConversation(cacheScope, conversation);
    mockGet.mockResolvedValue(conversation);
    jest.mocked(ask).mockReturnValueOnce(askRun({ lastMessageId: 'tool-1' }));
    const context = await renderContext();

    await act(async () => {
      await context().sendMessage({
        ...typed,
        query: '',
        decisions: [{ type: 'approve' }],
      });
    });

    expect(jest.mocked(ask).mock.calls[0][21]).toEqual(
      expect.objectContaining({ followLatest: false })
    );
  });

  it('resumes a decision that never produced a result instead of replying under it', async () => {
    const conversation = pendingConversation();
    const interrupt = conversation.mapping.interrupt;
    interrupt.children = ['decision-s'];
    conversation.mapping['decision-s'] = {
      id: 'decision-s',
      parent_id: 'interrupt',
      children: [],
      status: 'success',
      message: { role: 'user', content: '' },
      attrs: {
        tool_call: { status: 'success', decisions: [{ type: 'reject' }] },
      },
    } as unknown as ConversationDetail['mapping'][string];
    conversation.current_node = 'decision-s';
    setCachedConversation(cacheScope, conversation);
    mockGet.mockResolvedValue({ ...conversation, current_node: 'decision-s' });
    jest
      .mocked(ask)
      .mockReturnValueOnce(askRun({ lastMessageId: 'tool-s' }))
      .mockReturnValueOnce(askRun({ lastMessageId: 'answer' }));
    const context = await renderContext();

    await act(async () => {
      await context().sendMessage(typed);
    });

    const [resume, question] = jest.mocked(ask).mock.calls;
    expect(resume[5]).toBe('decision-s');
    expect(resume[13]?.decisions).toHaveLength(1);
    expect(question[5]).toBe('tool-s');
  });

  it('drops a failed decision under the server ID it was accepted with', async () => {
    const conversation = pendingConversation();
    conversation.mapping.interrupt.children = ['decision-s'];
    conversation.mapping['decision-s'] = {
      id: 'decision-s',
      parent_id: 'interrupt',
      children: [],
      status: 'failed',
      message: { role: 'user', content: '' },
      attrs: { client_request_id: 'local-d' },
    } as unknown as ConversationDetail['mapping'][string];
    setCachedConversation(cacheScope, conversation);
    const server = pendingConversation();
    mockGet.mockResolvedValue(server);
    jest.mocked(ask).mockReturnValueOnce(
      askRun({
        failed: true,
        requestId: 'local-d',
        acceptedMessageId: 'decision-s',
      })
    );
    const context = await renderContext();

    await act(async () => {
      await context()
        .sendMessage(typed)
        .catch(() => undefined);
    });

    expect(context().conversation.mapping['decision-s']).toBeUndefined();
    expect(context().conversation.mapping.interrupt.children).not.toContain(
      'decision-s'
    );
  });

  it('stays on the page while another client is still answering a newer question', async () => {
    const conversation = cachedConversation();
    conversation.mapping['message-a'].message.role = 'assistant' as never;
    setCachedConversation(cacheScope, conversation);
    // The server already has tab B's question under message-a, no answer yet.
    const withQuestion = {
      id: 'conversation-a',
      current_node: 'question-b',
      mapping: {
        'message-a': {
          ...conversation.mapping['message-a'],
          children: ['question-b'],
        },
        'question-b': {
          id: 'question-b',
          parent_id: 'message-a',
          children: [],
          status: 'success',
          message: { role: 'user', content: 'long question from tab B' },
        },
      },
    };
    mockGet.mockImplementation(
      (_url: string, config?: { params?: { branch_node_id?: string } }) =>
        Promise.resolve(
          config?.params?.branch_node_id === 'message-a'
            ? withQuestion
            : conversation
        )
    );
    const held = deferred<void>();
    jest.mocked(ask).mockReturnValueOnce(
      askRun(
        { lastMessageId: 'answer' },
        jest.fn(() => held.promise)
      )
    );
    const context = await renderContext();

    let sending!: Promise<void>;
    await act(async () => {
      sending = context().sendMessage(typed);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // While the server holds the question, nothing shows tab B's question
    // beside it: no sibling, no switched view.
    expect(jest.mocked(ask)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(ask).mock.calls[0][5]).toBe('message-a');
    expect(context().conversation.mapping['question-b']).toBeUndefined();
    expect(context().conversation.mapping['message-a'].children).not.toContain(
      'question-b'
    );
    await act(async () => {
      held.resolve();
      await sending;
    });
  });

  it('resumes a decision whose resume failed instead of asking under the failed reply', async () => {
    const conversation = pendingConversation();
    conversation.mapping.interrupt.children = ['decision-d'];
    conversation.mapping['decision-d'] = {
      id: 'decision-d',
      parent_id: 'interrupt',
      children: ['failed-f'],
      status: 'success',
      message: { role: 'user', content: '' },
      attrs: {
        tool_call: {
          status: 'success',
          decisions: [{ type: 'reject', end_turn: true }],
        },
      },
    } as unknown as ConversationDetail['mapping'][string];
    conversation.mapping['failed-f'] = {
      id: 'failed-f',
      parent_id: 'decision-d',
      children: [],
      status: 'failed',
      message: { role: 'assistant', content: '' },
      attrs: { error_message: 'fetch failed' },
    } as unknown as ConversationDetail['mapping'][string];
    conversation.current_node = 'failed-f';
    setCachedConversation(cacheScope, conversation);
    mockGet.mockResolvedValue(conversation);
    jest
      .mocked(ask)
      .mockReturnValueOnce(askRun({ lastMessageId: 'tool-r' }))
      .mockReturnValueOnce(askRun({ lastMessageId: 'answer' }));
    const context = await renderContext();

    await act(async () => {
      await context().sendMessage(typed);
    });

    const [resume, question] = jest.mocked(ask).mock.calls;
    expect(resume[5]).toBe('decision-d');
    expect(resume[13]?.decisions).toHaveLength(1);
    expect(question[5]).toBe('tool-r');
  });

  it('sends text once when another client resumed the decision it found', async () => {
    const conversation = cachedConversation();
    conversation.mapping['message-a'].message.role = 'assistant' as never;
    setCachedConversation(cacheScope, conversation);
    const decision = {
      id: 'decision-d',
      parent_id: 'message-a',
      children: [],
      status: 'success',
      message: { role: 'user', content: '' },
      attrs: {
        tool_call: { status: 'success', decisions: [{ type: 'approve' }] },
      },
    };
    // Tab B approved; its resume is still running, so D has no child yet.
    const withDecision = {
      id: 'conversation-a',
      current_node: 'decision-d',
      mapping: {
        'message-a': {
          ...conversation.mapping['message-a'],
          children: ['decision-d'],
        },
        'decision-d': decision,
      },
    };
    // After the refusal: B's resume finished with a tool result and a reply.
    const resumed = {
      id: 'conversation-a',
      current_node: 'answer-b',
      mapping: {
        ...withDecision.mapping,
        'decision-d': { ...decision, children: ['tool-b'] },
        'tool-b': {
          id: 'tool-b',
          parent_id: 'decision-d',
          children: ['answer-b'],
          status: 'success',
          message: { role: 'tool', content: 'created' },
        },
        'answer-b': {
          id: 'answer-b',
          parent_id: 'tool-b',
          children: [],
          status: 'success',
          message: { role: 'assistant', content: 'done' },
        },
      },
    };
    serveBranchBelow(conversation, {
      'message-a': withDecision,
      'decision-d': resumed,
    });
    jest
      .mocked(ask)
      .mockReturnValueOnce(
        askRun({ failed: true, alreadyDecided: true, requestId: 'local-d' })
      )
      .mockReturnValueOnce(askRun({ lastMessageId: 'answer' }));
    mockToastInfo.mockClear();
    const context = await renderContext();

    await act(async () => {
      await context().sendMessage(typed);
    });

    const calls = jest.mocked(ask).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][5]).toBe('decision-d');
    expect(calls[0][13]?.decisions).toHaveLength(1);
    expect(calls[1][1]).toBe('用一句话介绍北京');
    expect(calls[1][5]).toBe('answer-b');
    expect(mockToastInfo).toHaveBeenCalledWith('chat.decision.already_decided');
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
      outcome: { failed: false },
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
      outcome: { failed: false },
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

  it('requests a generated title from the search-token preview after reopening', async () => {
    jest
      .mocked(findFirstMessageWithMissingParent)
      .mockImplementation(
        jest.requireActual<typeof import('./utils')>('./utils')
          .findFirstMessageWithMissingParent
      );
    mockGet.mockResolvedValue({
      id: 'conversation-a',
      title: '',
      current_node: 'user-1',
      mapping: {
        'user-1': {
          id: 'user-1',
          parent_id: '',
          children: [],
          status: 'success',
          message: {
            role: 'user',
            content: `  ${WEB_SEARCH_QUERY_TOKEN}\n你好  `,
          },
        },
      },
    });
    function Probe() {
      useContext();
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    expect(mockFire).toHaveBeenCalledWith('chat:title:update', {
      conversationId: 'conversation-a',
      title: '你好',
    });
    expect(mockFire).toHaveBeenCalledWith('chat:title', {
      conversationId: 'conversation-a',
      text: '你好',
    });
  });

  it('does not request a generated title when the reopened conversation already has one', async () => {
    jest
      .mocked(findFirstMessageWithMissingParent)
      .mockImplementation(
        jest.requireActual<typeof import('./utils')>('./utils')
          .findFirstMessageWithMissingParent
      );
    mockGet.mockResolvedValue({
      id: 'conversation-a',
      title: '别的名字',
      current_node: 'user-1',
      mapping: {
        'user-1': {
          id: 'user-1',
          parent_id: '',
          children: [],
          status: 'success',
          message: {
            role: 'user',
            content: `${WEB_SEARCH_QUERY_TOKEN}你好`,
          },
        },
      },
    });
    function Probe() {
      useContext();
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    expect(mockFire).not.toHaveBeenCalledWith('chat:title', expect.anything());
  });

  it('publishes the first message text for the sidebar and clears it when sending fails', async () => {
    mockGet.mockResolvedValue({ id: 'conversation-a', mapping: {}, total: 0 });
    jest.mocked(ask).mockReturnValue({
      outcome: { failed: false },
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
      outcome: { failed: false },
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
