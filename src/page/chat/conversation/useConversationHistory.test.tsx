/** @jest-environment jsdom */

import { act } from 'react';
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
});
