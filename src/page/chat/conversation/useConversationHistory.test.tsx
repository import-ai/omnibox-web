/** @jest-environment jsdom */

import { act, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { ConversationDetail } from '@/page/chat/core/types/conversation';

import useConversationHistory from './useConversationHistory';

const mockGet = jest.fn();

jest.mock('@/lib/request', () => ({
  http: { get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock('./conversationCache', () => ({
  getCurrentUserId: () => 'user-a',
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function conversationEndingAt(leaf: {
  id: string;
  client_request_id?: string;
}): ConversationDetail {
  return {
    id: 'conversation-a',
    current_node: leaf.id,
    total: 2,
    mapping: {
      interrupt: {
        id: 'interrupt',
        parent_id: '',
        children: [leaf.id],
        status: 'success',
        message: { role: 'assistant', content: '' },
      },
      [leaf.id]: {
        id: leaf.id,
        parent_id: 'interrupt',
        children: [],
        status: 'failed',
        message: { role: 'user', content: 'hello' },
        attrs: leaf.client_request_id
          ? { client_request_id: leaf.client_request_id, pending_query: true }
          : {},
      },
    },
  } as unknown as ConversationDetail;
}

describe('useConversationHistory refresh', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ id: 'conversation-a', mapping: {} });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function refresh(conversation: ConversationDetail) {
    let history: ReturnType<typeof useConversationHistory> | undefined;
    function Probe() {
      history = useConversationHistory(
        'namespace-a',
        'user-a',
        conversation,
        jest.fn()
      );
      return null;
    }
    await act(async () => root.render(<Probe />));
    await act(async () => {
      await history!.refreshHistory();
    });
  }

  it('does not ask the server for a branch ending at a local message', async () => {
    await refresh(
      conversationEndingAt({ id: 'local-1', client_request_id: 'local-1' })
    );

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('refreshes a branch that ends at a server message', async () => {
    await refresh(
      conversationEndingAt({ id: 'server-1', client_request_id: 'local-1' })
    );

    expect(mockGet).toHaveBeenCalledWith(
      '/namespaces/namespace-a/conversations/conversation-a/messages',
      { params: { branch_leaf_id: 'server-1' } }
    );
  });
  it('retains final timing when lazy details replay an earlier running snapshot', async () => {
    const timing = {
      version: 1,
      answer_id: 'answer',
      run_id: 'run',
      started_at: '2026-11-09T00:00:00Z',
      status: 'complete',
      completed_at: '2026-11-09T00:00:05Z',
      duration_ms: 3000,
    };
    const original = {
      id: 'conversation-a',
      current_node: 'answer',
      mapping: {
        answer: {
          id: 'answer',
          clientKey: 1,
          parent_id: '',
          children: [],
          details_loaded: false,
          status: 'success',
          message: { role: 'assistant', content: 'answer' },
          attrs: { answer_timing: timing },
        },
      },
    } as unknown as ConversationDetail;
    mockGet.mockResolvedValue({
      mapping: {
        answer: {
          ...original.mapping.answer,
          status: 'streaming',
          message: {
            role: 'assistant',
            content: 'answer',
            reasoning_content: 'loaded',
          },
          attrs: {
            answer_timing: {
              version: 1,
              answer_id: 'answer',
              run_id: 'run',
              started_at: timing.started_at,
              status: 'running',
            },
          },
        },
      },
    });
    let history: ReturnType<typeof useConversationHistory> | undefined;
    let latest = original;
    function Probe() {
      const [conversation, setConversation] = useState(original);
      latest = conversation;
      history = useConversationHistory(
        'namespace-a',
        'user-a',
        conversation,
        setConversation
      );
      return null;
    }
    await act(async () => root.render(<Probe />));
    await act(async () => {
      await history!.loadDetails(['answer']);
    });
    expect(latest.mapping.answer.message.reasoning_content).toBe('loaded');
    expect(latest.mapping.answer.attrs?.answer_timing).toEqual(timing);
    expect(latest.mapping.answer.details_loaded).toBe(true);
    expect(latest.mapping.answer.status).toBe('success');
  });
});
