import type { SetStateAction } from 'react';

import { createMessageOperator } from './messageOperator';
import { MessageStatus, OpenAIMessageRole } from './types/chatResponse';
import type { ConversationDetail } from './types/conversation';

function updateConversation(
  conversation: ConversationDetail,
  updater: SetStateAction<ConversationDetail>
) {
  return typeof updater === 'function' ? updater(conversation) : updater;
}

describe('createMessageOperator', () => {
  it('handles missing messages and incomplete ancestor chains during streaming', () => {
    const conversation: ConversationDetail = {
      id: 'conversation',
      mapping: {
        assistant: {
          id: 'assistant',
          created_at: '2026-09-10T00:00:00.000Z',
          message: { role: OpenAIMessageRole.ASSISTANT },
          status: MessageStatus.STREAMING,
          parent_id: 'missing-user',
          children: [],
        },
      },
    };
    const operator = createMessageOperator(conversation, () => undefined);
    expect(operator.getParent('missing')).toBe('');
    expect(operator.getParent('assistant')).toBe('');
    expect(operator.getSiblings('missing')).toEqual([]);
    expect(operator.getSiblings('assistant')).toEqual([]);
    conversation.mapping['missing-user'] = {
      ...conversation.mapping.assistant,
      id: 'missing-user',
      parent_id: '',
      message: { role: OpenAIMessageRole.USER },
      children: ['assistant'],
    };
    expect(operator.getParent('assistant')).toBe('missing-user');
    expect(operator.getSiblings('assistant')).toEqual(['assistant']);
  });

  it('keeps terminal message status when attrs update later', () => {
    let conversation: ConversationDetail = {
      id: 'conversation',
      current_node: 'assistant',
      mapping: {
        assistant: {
          id: 'assistant',
          created_at: '2026-07-06T00:00:00.000Z',
          message: {
            role: OpenAIMessageRole.ASSISTANT,
            content: 'Done',
          },
          status: MessageStatus.SUCCESS,
          parent_id: 'user',
          children: [],
        },
      },
    };
    const operator = createMessageOperator(conversation, updater => {
      conversation = updateConversation(conversation, updater);
    });

    operator.update({
      response_type: 'delta',
      message: {},
      attrs: { metrics: { tokens: 7, tps: 1.5 } },
    });

    expect(conversation.mapping.assistant.status).toBe(MessageStatus.SUCCESS);
    expect(conversation.mapping.assistant.attrs?.metrics).toEqual({
      tokens: 7,
      tps: 1.5,
    });
  });

  it('marks live tool messages even when the backend omitted tool_call attrs', () => {
    let conversation: ConversationDetail = {
      id: 'conversation',
      current_node: 'tool',
      mapping: {
        tool: {
          id: 'tool',
          created_at: '2026-07-06T00:00:00.000Z',
          message: {
            role: OpenAIMessageRole.TOOL,
            tool_call_id: 'tool-call',
          },
          status: MessageStatus.STREAMING,
          parent_id: 'assistant',
          children: [],
        },
      },
    };
    const operator = createMessageOperator(conversation, updater => {
      conversation = updateConversation(conversation, updater);
    });

    operator.done('tool');

    expect(conversation.mapping.tool.status).toBe(MessageStatus.SUCCESS);
    expect(conversation.mapping.tool.attrs?.tool_call).toEqual({
      in_streaming: true,
      status: 'success',
    });
  });
});

it('replaces the pending query with the persisted receipt without duplicating text or links', () => {
  let conversation: ConversationDetail = { id: 'conv', mapping: {} };
  const operator = createMessageOperator(conversation, updater => {
    conversation = updateConversation(conversation, updater);
  });
  operator.add({
    response_type: 'bos',
    id: 'local',
    role: OpenAIMessageRole.USER,
    created_at: '',
    parentId: '',
    attrs: { pending_query: true, client_request_id: 'local' },
  });
  operator.update(
    { response_type: 'delta', message: { content: 'hello' } },
    'local'
  );
  expect(conversation.mapping.local.message.content).toBe('hello');
  operator.add({
    response_type: 'bos',
    id: 'saved',
    role: OpenAIMessageRole.USER,
    created_at: '2026-09-12T02:30:00Z',
    parentId: '',
    attrs: { client_request_id: 'local' },
  });
  operator.update(
    { response_type: 'delta', message: { content: 'hello' } },
    'saved'
  );
  operator.done('saved');
  expect(Object.keys(conversation.mapping)).toEqual(['saved']);
  expect(conversation.mapping.saved.message.content).toBe('hello');
  expect(conversation.mapping.saved.status).toBe(MessageStatus.SUCCESS);
  expect(conversation.current_node).toBe('saved');
});
