/** @jest-environment jsdom */
import { act, useRef, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import {
  createMessageOperator,
  type MessageOperator,
} from '@/page/chat/core/messageOperator';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';

import useChatStreamRecovery from './useChatStreamRecovery';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function message(
  id: string,
  role: OpenAIMessageRole,
  status: MessageStatus,
  overrides: Partial<MessageDetail> = {}
): MessageDetail {
  return {
    id,
    parent_id: '',
    children: [],
    status,
    message: { role, content: '' },
    ...overrides,
  } as MessageDetail;
}

function conversation(
  assistantStatus: MessageStatus,
  current_node = 'assistant-1',
  withCursor = true
): ConversationDetail {
  const user = message(
    'user-1',
    OpenAIMessageRole.USER,
    MessageStatus.SUCCESS,
    {
      children: ['assistant-1'],
    }
  );
  const assistant = message(
    'assistant-1',
    OpenAIMessageRole.ASSISTANT,
    assistantStatus,
    {
      parent_id: 'user-1',
      attrs: withCursor ? { stream_event_id: '1-3' } : undefined,
    }
  );
  return {
    id: 'conversation',
    mapping: { 'user-1': user, 'assistant-1': assistant },
    current_node,
  };
}

function operator() {
  return {
    error: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    done: jest.fn(),
    stop: jest.fn(),
    activate: jest.fn(),
    getSiblings: jest.fn(() => []),
    getParent: jest.fn(() => ''),
  } as unknown as MessageOperator;
}

describe('useChatStreamRecovery', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderRecovery(
    initial: ConversationDetail,
    options: {
      loadSnapshot: jest.Mock;
      createResumeStream: jest.Mock;
      messageOperator?: MessageOperator;
    }
  ) {
    let recovery!: ReturnType<typeof useChatStreamRecovery>;
    let current!: ConversationDetail;
    let replace!: (value: ConversationDetail) => void;
    let currentOperator!: MessageOperator;
    function Probe() {
      const [state, setState] = useState(initial);
      current = state;
      replace = setState;
      currentOperator = createMessageOperator(state, setState);
      const ref = useRef(state);
      ref.current = state;
      const askAbortRef = useRef<(() => Promise<void>) | null>(null);
      const detachStreamRef = useRef<(() => void) | null>(null);
      recovery = useChatStreamRecovery({
        conversationId: 'conversation',
        conversationRef: ref,
        setConversation: setState,
        messageOperator: options.messageOperator ?? currentOperator,
        askAbortRef,
        detachStreamRef,
        loadSnapshot: options.loadSnapshot,
        createResumeStream: options.createResumeStream,
      });
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    return {
      get: () => recovery,
      state: () => current,
      set: (value: ConversationDetail) => replace(value),
      operator: () => currentOperator,
    };
  }

  async function showPage() {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(resolve => setTimeout(resolve, 20));
    });
  }

  it('resumes an unfinished branch from the page cursor', async () => {
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce(conversation(MessageStatus.STREAMING))
      .mockResolvedValueOnce(conversation(MessageStatus.SUCCESS));
    const start = jest.fn().mockResolvedValue(undefined);
    const createResumeStream = jest.fn(() => ({
      start,
      cancel: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      getLastEventId: () => '1-9',
    }));
    const probe = await renderRecovery(conversation(MessageStatus.STREAMING), {
      loadSnapshot,
      createResumeStream,
      messageOperator: operator(),
    });

    await showPage();

    expect(loadSnapshot).toHaveBeenNthCalledWith(1, {
      branch_node_id: 'assistant-1',
    });
    expect(createResumeStream).toHaveBeenCalledWith(
      '1-3',
      expect.any(Function)
    );
    expect(start).toHaveBeenCalledTimes(1);
    expect(probe.get().streamState).toBe('connected');
  });

  it('reports an interruption when a resume ends without a terminal event', async () => {
    const messageOperator = operator();
    const loadSnapshot = jest
      .fn()
      .mockResolvedValue(conversation(MessageStatus.STREAMING));
    const createResumeStream = jest.fn(() => ({
      start: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      getLastEventId: () => undefined,
    }));
    const probe = await renderRecovery(conversation(MessageStatus.STREAMING), {
      loadSnapshot,
      createResumeStream,
      messageOperator,
    });

    await showPage();

    expect(messageOperator.error).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'stream_interrupted' }),
      'assistant-1'
    );
    expect(probe.get().streamState).toBe('interrupted');
  });

  it('continues live-only when an existing reply has no local cursor', async () => {
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce(
        conversation(MessageStatus.STREAMING, 'assistant-1', false)
      )
      .mockResolvedValueOnce(
        conversation(MessageStatus.SUCCESS, 'assistant-1', false)
      );
    const createResumeStream = jest.fn(() => ({
      start: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      getLastEventId: () => undefined,
    }));
    await renderRecovery(
      conversation(MessageStatus.STREAMING, 'assistant-1', false),
      {
        loadSnapshot,
        createResumeStream,
        messageOperator: operator(),
      }
    );

    await showPage();

    expect(createResumeStream).toHaveBeenCalledWith('$', expect.any(Function));
  });

  it('marks a request the server never received without resending it', async () => {
    const messageOperator = operator();
    const local = message(
      'request-1',
      OpenAIMessageRole.USER,
      MessageStatus.PENDING,
      {
        parent_id: 'user-1',
        attrs: { client_request_id: 'request-1', pending_query: true },
      }
    );
    const initial: ConversationDetail = {
      id: 'conversation',
      mapping: { 'request-1': local },
      current_node: 'request-1',
    };
    const loadSnapshot = jest
      .fn()
      .mockResolvedValue({ id: 'conversation', mapping: {}, total: 0 });
    const start = jest.fn().mockResolvedValue(undefined);
    const createResumeStream = jest.fn(() => ({
      start,
      cancel: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      getLastEventId: () => undefined,
    }));
    const probe = await renderRecovery(initial, {
      loadSnapshot,
      createResumeStream,
      messageOperator,
    });

    await showPage();

    expect(loadSnapshot).toHaveBeenNthCalledWith(1, {
      branch_node_id: 'user-1',
    });
    // Resume is the only way to learn whether the server took the question.
    expect(createResumeStream).toHaveBeenCalledWith(
      undefined,
      expect.any(Function)
    );
    expect(messageOperator.error).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'stream_send_failed' }),
      'request-1'
    );
    expect(probe.get().streamState).toBe('interrupted');
  });

  it('adopts a request the server accepted while the page was away', async () => {
    const messageOperator = operator();
    const local = message(
      'request-1',
      OpenAIMessageRole.USER,
      MessageStatus.PENDING,
      {
        parent_id: 'user-1',
        attrs: { client_request_id: 'request-1', pending_query: true },
        message: { role: OpenAIMessageRole.USER, content: 'hello' },
      }
    );
    const initial: ConversationDetail = {
      id: 'conversation',
      mapping: { 'request-1': local },
      current_node: 'request-1',
    };
    const accepted = message(
      'server-1',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS,
      {
        parent_id: 'user-1',
        attrs: { client_request_id: 'request-1' },
        message: { role: OpenAIMessageRole.USER, content: 'hello' },
      }
    );
    const reply = message(
      'assistant-1',
      OpenAIMessageRole.ASSISTANT,
      MessageStatus.SUCCESS,
      { parent_id: 'server-1' }
    );
    const snapshot: ConversationDetail = {
      id: 'conversation',
      mapping: { 'server-1': accepted, 'assistant-1': reply },
      current_node: 'assistant-1',
    };
    const loadSnapshot = jest.fn().mockResolvedValue(snapshot);
    const createResumeStream = jest.fn(() => ({
      start: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      getLastEventId: () => undefined,
    }));
    const probe = await renderRecovery(initial, {
      loadSnapshot,
      createResumeStream,
      messageOperator,
    });

    await showPage();

    expect(messageOperator.error).not.toHaveBeenCalledWith(
      expect.objectContaining({ code: 'stream_send_failed' }),
      expect.anything()
    );
    expect(probe.get().streamState).toBe('connected');
  });

  it('waits for the network instead of failing while offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    const loadSnapshot = jest.fn();
    const createResumeStream = jest.fn();
    const probe = await renderRecovery(conversation(MessageStatus.STREAMING), {
      loadSnapshot,
      createResumeStream,
      messageOperator: operator(),
    });

    await showPage();

    expect(loadSnapshot).not.toHaveBeenCalled();
    expect(createResumeStream).not.toHaveBeenCalled();
    expect(probe.get().streamState).toBe('offline');
  });
  it('replaces a suspended recovery reader when the network comes back', async () => {
    let finish!: () => void;
    const destroy = jest.fn(() => finish());
    const createResumeStream = jest
      .fn()
      .mockReturnValueOnce({
        start: () =>
          new Promise<void>(resolve => {
            finish = resolve;
          }),
        destroy,
        getLastEventId: () => '1-8',
      })
      .mockReturnValue({ start: async () => undefined, destroy: jest.fn() });
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce(conversation(MessageStatus.STREAMING))
      .mockResolvedValueOnce(conversation(MessageStatus.SUCCESS));
    const probe = await renderRecovery(conversation(MessageStatus.STREAMING), {
      loadSnapshot,
      createResumeStream,
    });
    let first!: Promise<void>;
    await act(async () => {
      first = probe.get().recover();
    });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    expect(destroy).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
      await first;
    });
    expect(loadSnapshot).toHaveBeenCalledTimes(2);
    expect(probe.get().streamState).toBe('connected');
  });

  it('replaces persisted pending details with a completed server snapshot', async () => {
    const initial = conversation(MessageStatus.STREAMING);
    initial.mapping['assistant-1'].details_loaded = true;
    initial.mapping['assistant-1'].updated_at = '2026-11-04T00:00:00Z';
    initial.mapping['assistant-1'].message.content = 'partial';
    const snapshot = conversation(MessageStatus.SUCCESS);
    snapshot.mapping['assistant-1'].updated_at =
      initial.mapping['assistant-1'].updated_at;
    snapshot.mapping['assistant-1'].message.content = 'complete';
    const probe = await renderRecovery(initial, {
      loadSnapshot: jest.fn().mockResolvedValue(snapshot),
      createResumeStream: jest.fn(),
    });
    await showPage();
    expect(probe.state().mapping['assistant-1'].status).toBe(
      MessageStatus.SUCCESS
    );
    expect(probe.state().mapping['assistant-1'].message.content).toBe(
      'complete'
    );
  });

  it('does not replay a finished accepted question into a duplicate answer', async () => {
    const initial: ConversationDetail = {
      id: 'conversation',
      current_node: 'request-1',
      mapping: {
        'request-1': message(
          'request-1',
          OpenAIMessageRole.USER,
          MessageStatus.PENDING,
          {
            attrs: { client_request_id: 'request-1' },
            message: { role: OpenAIMessageRole.USER, content: 'hello' },
          }
        ),
      },
    };
    const snapshot = conversation(MessageStatus.SUCCESS);
    snapshot.mapping['user-1'].attrs = { client_request_id: 'request-1' };
    const createResumeStream = jest.fn(() => ({
      start: async () => undefined,
    }));
    const probe = await renderRecovery(initial, {
      loadSnapshot: jest.fn().mockResolvedValue(snapshot),
      createResumeStream,
    });
    await showPage();
    expect(createResumeStream).not.toHaveBeenCalled();
    expect(probe.state().mapping['request-1']).toBeUndefined();
    expect(probe.state().current_node).toBe('assistant-1');
  });

  it.each(['stream_send_failed', 'quota_exceeded', 'forbidden'])(
    'does not recover an explicitly failed local request (%s)',
    async code => {
      const initial: ConversationDetail = {
        id: 'conversation',
        current_node: 'request-1',
        mapping: {
          'request-1': message(
            'request-1',
            OpenAIMessageRole.USER,
            MessageStatus.FAILED,
            {
              attrs: {
                client_request_id: 'request-1',
                error_code: code,
              },
            }
          ),
        },
      };
      const loadSnapshot = jest.fn();
      await renderRecovery(initial, {
        loadSnapshot,
        createResumeStream: jest.fn(),
      });
      await showPage();
      expect(loadSnapshot).not.toHaveBeenCalled();
    }
  );
  it('does not merge a snapshot that was queued before a new turn took ownership', async () => {
    let resolve!: (value: ConversationDetail) => void;
    const loadSnapshot = jest.fn(
      () =>
        new Promise<ConversationDetail>(done => {
          resolve = done;
        })
    );
    const probe = await renderRecovery(conversation(MessageStatus.STREAMING), {
      loadSnapshot,
      createResumeStream: jest.fn(),
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = probe.get().recover();
    });
    await act(async () => {
      probe.get().reset();
      const next = conversation(MessageStatus.STREAMING);
      next.mapping['assistant-1'].message.content = 'new answer';
      probe.set(next);
      resolve(conversation(MessageStatus.SUCCESS));
      await pending;
    });
    expect(probe.state().mapping['assistant-1'].message.content).toBe(
      'new answer'
    );
    expect(probe.state().mapping['assistant-1'].status).toBe(
      MessageStatus.STREAMING
    );
  });

  it('does not let an old resumed reader overwrite a new turn cursor', async () => {
    let finish!: () => void;
    const loadSnapshot = jest
      .fn()
      .mockResolvedValue(conversation(MessageStatus.STREAMING));
    const createResumeStream = jest
      .fn()
      .mockReturnValueOnce({
        start: () =>
          new Promise<void>(done => {
            finish = done;
          }),
        destroy: jest.fn(),
        getLastEventId: () => '1-900',
      })
      .mockReturnValue({ start: async () => undefined });
    const probe = await renderRecovery(conversation(MessageStatus.STREAMING), {
      loadSnapshot,
      createResumeStream,
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = probe.get().recover();
    });
    await act(async () => {
      probe.get().reset();
      finish();
      await pending;
    });
    await act(async () => {
      await probe.get().recover();
    });
    expect(createResumeStream).toHaveBeenLastCalledWith(
      '1-3',
      expect.any(Function)
    );
  });

  it('preserves a completed streamed answer when the final database snapshot still lags', async () => {
    let finish!: () => void;
    const loadSnapshot = jest
      .fn()
      .mockResolvedValue(conversation(MessageStatus.STREAMING));
    const createResumeStream = jest.fn(() => ({
      start: () =>
        new Promise<void>(done => {
          finish = done;
        }),
      getLastResponseType: () => 'done',
    }));
    const probe = await renderRecovery(conversation(MessageStatus.STREAMING), {
      loadSnapshot,
      createResumeStream,
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = probe.get().recover();
    });
    await act(async () => {
      probe
        .operator()
        .update(
          { response_type: 'delta', message: { content: 'complete' } },
          'assistant-1'
        );
      probe.operator().done('assistant-1');
    });
    await act(async () => {
      finish();
      await pending;
    });
    expect(probe.state().mapping['assistant-1'].status).toBe(
      MessageStatus.SUCCESS
    );
    expect(probe.state().mapping['assistant-1'].message.content).toBe(
      'complete'
    );
    expect(probe.get().streamState).toBe('connected');
  });

  it('keeps live revisions delivered while a final snapshot is deferred', async () => {
    let finish!: () => void;
    let snapshot!: (value: ConversationDetail) => void;
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce(conversation(MessageStatus.STREAMING))
      .mockImplementationOnce(
        () =>
          new Promise<ConversationDetail>(done => {
            snapshot = done;
          })
      );
    const createResumeStream = jest.fn(() => ({
      start: () =>
        new Promise<void>(done => {
          finish = done;
        }),
      getLastResponseType: () => 'done',
    }));
    const probe = await renderRecovery(conversation(MessageStatus.STREAMING), {
      loadSnapshot,
      createResumeStream,
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = probe.get().recover();
    });
    await act(async () => {
      finish();
    });
    await act(async () => {
      probe
        .operator()
        .update(
          { response_type: 'delta', message: { content: 'newer' } },
          'assistant-1'
        );
      probe.operator().done('assistant-1');
    });
    await act(async () => {
      snapshot(conversation(MessageStatus.SUCCESS));
      await pending;
    });
    expect(probe.state().mapping['assistant-1'].message.content).toBe('newer');
  });

  it('stops recovery after an explicit successful cancellation', async () => {
    const loadSnapshot = jest.fn();
    const probe = await renderRecovery(conversation(MessageStatus.STREAMING), {
      loadSnapshot,
      createResumeStream: jest.fn(),
    });
    await act(async () => {
      probe.get().stop();
    });
    await showPage();
    expect(loadSnapshot).not.toHaveBeenCalled();
    expect(probe.get().streamState).toBe('connected');
  });

  it('retries transport failures from the latest delivered cursor', async () => {
    jest.useFakeTimers();
    try {
      const loadSnapshot = jest
        .fn()
        .mockResolvedValue(conversation(MessageStatus.STREAMING));
      const createResumeStream = jest
        .fn()
        .mockReturnValueOnce({
          start: async () => {
            throw { code: 'STREAM_READ_FAILED' };
          },
          getLastEventId: () => '1-8',
        })
        .mockReturnValue({
          start: async () => undefined,
          getLastResponseType: () => 'done',
        });
      const probe = await renderRecovery(
        conversation(MessageStatus.STREAMING),
        { loadSnapshot, createResumeStream }
      );
      let pending!: Promise<void>;
      await act(async () => {
        pending = probe.get().recover();
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000);
        await pending;
      });
      expect(createResumeStream).toHaveBeenLastCalledWith(
        '1-8',
        expect.any(Function)
      );
      expect(probe.get().streamState).toBe('connected');
    } finally {
      jest.useRealTimers();
    }
  });
});
