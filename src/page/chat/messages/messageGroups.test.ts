import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';
import {
  buildMessageDisplayItems,
  buildMessageIndexItems,
} from './messageGroups';

function buildMessage(
  overrides: Partial<MessageDetail> & Pick<MessageDetail, 'id'>
): MessageDetail {
  return {
    message: {
      role: OpenAIMessageRole.ASSISTANT,
    },
    status: MessageStatus.SUCCESS,
    parent_id: 'parent',
    children: [],
    ...overrides,
  };
}

function displayIds(messages: MessageDetail[], loading = false) {
  return buildMessageDisplayItems(messages, loading).map(item =>
    item.type === 'message'
      ? `message:${item.message.id}`
      : `process:${item.messages.map(message => message.id).join(',')}`
  );
}

describe('buildMessageDisplayItems', () => {
  it('collapses assistant/tool process messages after the final answer succeeds', () => {
    expect(
      displayIds([
        buildMessage({ id: 'user', message: { role: OpenAIMessageRole.USER } }),
        buildMessage({
          id: 'assistant-tool-call',
          message: {
            role: OpenAIMessageRole.ASSISTANT,
            tool_calls: [
              {
                id: 'tool-call',
                type: 'function',
                function: { name: 'web_search', arguments: '{}' },
              },
            ],
          },
        }),
        buildMessage({
          id: 'tool-message',
          message: { role: OpenAIMessageRole.TOOL, tool_call_id: 'tool-call' },
        }),
        buildMessage({
          id: 'final-answer',
          message: { role: OpenAIMessageRole.ASSISTANT, content: 'Done' },
        }),
      ])
    ).toEqual([
      'message:user',
      'process:assistant-tool-call,tool-message',
      'message:final-answer',
    ]);
  });

  it('keeps process messages visible while the final answer is streaming', () => {
    expect(
      displayIds([
        buildMessage({
          id: 'tool-message',
          message: { role: OpenAIMessageRole.TOOL },
        }),
        buildMessage({
          id: 'final-answer',
          status: MessageStatus.STREAMING,
          message: {
            role: OpenAIMessageRole.ASSISTANT,
            content: 'In progress',
          },
        }),
      ])
    ).toEqual(['message:tool-message', 'message:final-answer']);
  });

  it('keeps only the latest response visible while streaming', () => {
    expect(
      displayIds(
        [
          buildMessage({
            id: 'previous-tool-message',
            message: { role: OpenAIMessageRole.TOOL },
          }),
          buildMessage({
            id: 'previous-final-answer',
            message: { role: OpenAIMessageRole.ASSISTANT, content: 'Done' },
          }),
          buildMessage({
            id: 'next-user',
            message: { role: OpenAIMessageRole.USER, content: 'Next' },
          }),
          buildMessage({
            id: 'tool-message',
            message: { role: OpenAIMessageRole.TOOL },
          }),
          buildMessage({
            id: 'intermediate-answer',
            message: {
              role: OpenAIMessageRole.ASSISTANT,
              content: 'I found one result. I will keep checking.',
            },
          }),
        ],
        true
      )
    ).toEqual([
      'process:previous-tool-message',
      'message:previous-final-answer',
      'message:next-user',
      'message:tool-message',
      'message:intermediate-answer',
    ]);
  });

  it('collapses persisted history without frontend stream state', () => {
    expect(
      displayIds([
        buildMessage({
          id: 'tool-message',
          created_at: '2026-07-04T10:00:00.000Z',
          message: { role: OpenAIMessageRole.TOOL },
        }),
        buildMessage({
          id: 'final-answer',
          created_at: '2026-07-04T10:01:00.000Z',
          message: { role: OpenAIMessageRole.ASSISTANT, content: 'Done' },
        }),
      ])
    ).toEqual(['process:tool-message', 'message:final-answer']);
  });
});

describe('buildMessageIndexItems', () => {
  it('pairs user queries with the final assistant answer', () => {
    expect(
      buildMessageIndexItems([
        buildMessage({
          id: 'user',
          message: { role: OpenAIMessageRole.USER, content: 'Question?' },
        }),
        buildMessage({
          id: 'assistant-tool-call',
          message: {
            role: OpenAIMessageRole.ASSISTANT,
            tool_calls: [
              {
                id: 'tool-call',
                type: 'function',
                function: { name: 'web_search', arguments: '{}' },
              },
            ],
          },
        }),
        buildMessage({
          id: 'tool-message',
          message: { role: OpenAIMessageRole.TOOL, tool_call_id: 'tool-call' },
        }),
        buildMessage({
          id: 'final-answer',
          message: { role: OpenAIMessageRole.ASSISTANT, content: 'Answer.' },
        }),
      ])
    ).toEqual([
      {
        answerMessageId: 'final-answer',
        id: 'user',
        targetMessageId: 'user',
        query: 'Question?',
        answer: 'Answer.',
      },
    ]);
  });
});
