/** @jest-environment jsdom */
import { act, useRef, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { MessageOperator } from '@/page/chat/core/messageOperator';
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
      messageOperator: MessageOperator;
    }
  ) {
    let recovery!: ReturnType<typeof useChatStreamRecovery>;
    function Probe() {
      const [state, setState] = useState(initial);
      const ref = useRef(state);
      ref.current = state;
      const askAbortRef = useRef<(() => Promise<void>) | null>(null);
      const detachStreamRef = useRef<(() => void) | null>(null);
      recovery = useChatStreamRecovery({
        conversationId: 'conversation',
        conversationRef: ref,
        setConversation: setState,
        messageOperator: options.messageOperator,
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
    return { get: () => recovery };
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
});
