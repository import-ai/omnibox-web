import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';

import {
  adoptAcceptedRequest,
  findAcceptedRequest,
  getBranchEventId,
  hasUnfinishedTurn,
  interruptionPlan,
  isLocalRequestMessage,
  isReplyComplete,
  resumeStreamCursor,
  snapshotQuery,
} from './chatStreamRecovery';

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
  mapping: Record<string, MessageDetail>,
  current_node: string
): ConversationDetail {
  return { id: 'conversation', mapping, current_node };
}

describe('chat stream recovery state', () => {
  it('recognizes a request the server never accepted', () => {
    const local = message(
      'request-1',
      OpenAIMessageRole.USER,
      MessageStatus.PENDING,
      {
        attrs: { client_request_id: 'request-1', pending_query: true },
      }
    );
    expect(isLocalRequestMessage(local)).toBe(true);
    expect(isLocalRequestMessage({ ...local, id: 'server-1' })).toBe(false);
  });

  it('reconciles unfinished replies and local-only requests', () => {
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
      MessageStatus.STREAMING,
      { parent_id: 'user-1' }
    );
    const running = conversation(
      { 'user-1': user, 'assistant-1': assistant },
      'assistant-1'
    );
    expect(hasUnfinishedTurn(running)).toBe(true);
    expect(snapshotQuery(running)).toEqual({ branch_node_id: 'assistant-1' });
    expect(hasUnfinishedTurn(conversation({ 'user-1': user }, 'user-1'))).toBe(
      true
    );

    const finished = conversation(
      {
        'user-1': user,
        'assistant-1': { ...assistant, status: MessageStatus.SUCCESS },
      },
      'assistant-1'
    );
    expect(hasUnfinishedTurn(finished)).toBe(false);

    const local = message(
      'request-1',
      OpenAIMessageRole.USER,
      MessageStatus.PENDING,
      {
        parent_id: 'user-1',
        attrs: { client_request_id: 'request-1', pending_query: true },
      }
    );
    const pending = conversation(
      { 'user-1': user, 'request-1': local },
      'request-1'
    );
    expect(hasUnfinishedTurn(pending)).toBe(true);
    // A local-only message is unknown to the server, so read below its parent.
    expect(snapshotQuery(pending)).toEqual({ branch_node_id: 'user-1' });
  });

  it('reads the cursor from the branch on screen only', () => {
    const root = message(
      'root',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS,
      {
        children: ['mine', 'other'],
      }
    );
    const mine = message(
      'mine',
      OpenAIMessageRole.ASSISTANT,
      MessageStatus.STREAMING,
      {
        parent_id: 'root',
        attrs: { stream_event_id: '1-4' },
      }
    );
    const other = message(
      'other',
      OpenAIMessageRole.ASSISTANT,
      MessageStatus.SUCCESS,
      {
        parent_id: 'root',
        attrs: { stream_event_id: '1-99' },
      }
    );
    expect(getBranchEventId(conversation({ root, mine, other }, 'mine'))).toBe(
      '1-4'
    );
    expect(
      resumeStreamCursor(conversation({ root, mine, other }, 'mine'))
    ).toBe('1-4');
    // A reply loaded from the server has no cursor; replaying from the start
    // would append its text again, so follow live events only.
    const loaded = conversation(
      { root, mine: { ...mine, attrs: undefined }, other },
      'mine'
    );
    expect(resumeStreamCursor(loaded)).toBe('$');
    expect(resumeStreamCursor(conversation({ root }, 'root'))).toBeUndefined();
  });

  it('replaces a local request with the accepted server message', () => {
    const parent = message(
      'parent',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS,
      {
        children: ['request-1'],
      }
    );
    const local = message(
      'request-1',
      OpenAIMessageRole.USER,
      MessageStatus.PENDING,
      {
        parent_id: 'parent',
        attrs: { client_request_id: 'request-1', pending_query: true },
      }
    );
    const accepted = message(
      'server-1',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS,
      {
        parent_id: 'parent',
        attrs: { client_request_id: 'request-1' },
      }
    );
    const adopted = adoptAcceptedRequest(
      conversation(
        { parent, 'request-1': local, 'server-1': accepted },
        'server-1'
      ),
      'request-1'
    );
    expect(adopted.mapping['request-1']).toBeUndefined();
    expect(adopted.mapping['parent'].children).toEqual(['server-1']);
  });

  it('keeps the view on a live node after adopting a request', () => {
    const parent = message(
      'parent',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS,
      { children: ['request-1'] }
    );
    const local = message(
      'request-1',
      OpenAIMessageRole.USER,
      MessageStatus.PENDING,
      {
        parent_id: 'parent',
        attrs: { client_request_id: 'request-1', pending_query: true },
      }
    );
    const accepted = message(
      'server-1',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS,
      { parent_id: 'parent', attrs: { client_request_id: 'request-1' } }
    );
    const adopted = adoptAcceptedRequest(
      conversation(
        { parent, 'request-1': local, 'server-1': accepted },
        'request-1'
      ),
      'request-1'
    );
    expect(adopted.current_node).toBe('server-1');
  });

  it('matches an accepted request without a client request id by parent and text', () => {
    const parent = message(
      'parent',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS,
      {
        children: ['request-1'],
      }
    );
    const local = message(
      'request-1',
      OpenAIMessageRole.USER,
      MessageStatus.PENDING,
      {
        parent_id: 'parent',
        attrs: { client_request_id: 'request-1', pending_query: true },
      }
    );
    local.message.content = 'hello';
    local.created_at = '2026-11-04T02:00:00Z';
    const accepted = message(
      'server-1',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS,
      {
        parent_id: 'parent',
      }
    );
    accepted.message.content = 'hello';
    accepted.created_at = '2026-11-04T02:00:01Z';
    const adopted = adoptAcceptedRequest(
      conversation(
        { parent, 'request-1': local, 'server-1': accepted },
        'server-1'
      ),
      'request-1'
    );
    expect(adopted.mapping['request-1']).toBeUndefined();
    expect(adopted.mapping['parent'].children).toEqual(['server-1']);
  });

  it('plans an assistant placeholder for an interrupted question', () => {
    const user = message(
      'user-1',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS
    );
    expect(
      interruptionPlan(conversation({ 'user-1': user }, 'user-1'))
    ).toEqual({ assistantParentId: 'user-1' });

    const assistant = message(
      'assistant-1',
      OpenAIMessageRole.ASSISTANT,
      MessageStatus.STREAMING,
      { parent_id: 'user-1' }
    );
    expect(
      interruptionPlan(
        conversation(
          { 'user-1': user, 'assistant-1': assistant },
          'assistant-1'
        )
      )
    ).toEqual({ messageId: 'assistant-1' });

    expect(
      interruptionPlan(
        conversation(
          {
            'user-1': user,
            'assistant-1': { ...assistant, status: MessageStatus.SUCCESS },
          },
          'assistant-1'
        )
      )
    ).toBeUndefined();
  });

  it('never treats a question without a reply as complete', () => {
    const user = message(
      'user-1',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS
    );
    expect(isReplyComplete(conversation({ 'user-1': user }, 'user-1'))).toBe(
      false
    );
    expect(isReplyComplete(conversation({}, ''))).toBe(true);
  });
  it('does not reuse a previous turn cursor after the server resets its sequence', () => {
    const previous = message(
      'old-answer',
      OpenAIMessageRole.ASSISTANT,
      MessageStatus.SUCCESS,
      { attrs: { stream_event_id: '1-900' } }
    );
    const pending = message(
      'new-request',
      OpenAIMessageRole.USER,
      MessageStatus.PENDING,
      { parent_id: previous.id, attrs: { client_request_id: 'new-request' } }
    );
    const state = conversation(
      { [previous.id]: previous, [pending.id]: pending },
      pending.id
    );
    expect(resumeStreamCursor(state)).toBeUndefined();
  });
  it('does not adopt an older identical sibling as proof of request delivery', () => {
    const local = message(
      'request',
      OpenAIMessageRole.USER,
      MessageStatus.PENDING,
      {
        parent_id: 'parent',
        created_at: '2026-11-04T02:00:00Z',
        attrs: { client_request_id: 'request' },
        message: { role: OpenAIMessageRole.USER, content: 'hello' },
      }
    );
    const older = message(
      'older',
      OpenAIMessageRole.USER,
      MessageStatus.SUCCESS,
      {
        parent_id: 'parent',
        created_at: '2026-11-04T01:00:00Z',
        message: { role: OpenAIMessageRole.USER, content: 'hello' },
      }
    );
    expect(
      findAcceptedRequest(
        conversation({ request: local, older }, local.id),
        local
      )
    ).toBeUndefined();
  });
});
