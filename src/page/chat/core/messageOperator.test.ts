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
});
