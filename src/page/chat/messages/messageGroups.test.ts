import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';
import {
  buildMessageDisplayItems,
  getCollapsedProcessDurationSeconds,
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

describe('buildMessageDisplayItems', () => {
  it('collapses assistant/tool process messages after the final answer succeeds', () => {
    const toolCallingAssistant = buildMessage({
      id: 'assistant-tool-call',
      message: {
        role: OpenAIMessageRole.ASSISTANT,
        tool_calls: [
          {
            id: 'tool-call',
            type: 'function',
            function: {
              name: 'web_search',
              arguments: '{}',
            },
          },
        ],
      },
    });
    const toolMessage = buildMessage({
      id: 'tool-message',
      message: {
        role: OpenAIMessageRole.TOOL,
        tool_call_id: 'tool-call',
      },
    });
    const finalAnswer = buildMessage({
      id: 'final-answer',
      attrs: {
        response_done: true,
      },
      message: {
        role: OpenAIMessageRole.ASSISTANT,
        content: 'Done',
      },
    });

    expect(
      buildMessageDisplayItems([
        buildMessage({ id: 'user', message: { role: OpenAIMessageRole.USER } }),
        toolCallingAssistant,
        toolMessage,
        finalAnswer,
      ])
    ).toEqual([
      {
        type: 'message',
        message: expect.objectContaining({ id: 'user' }),
      },
      {
        type: 'collapsed_process',
        messages: [toolCallingAssistant, toolMessage],
        finalMessage: finalAnswer,
      },
      {
        type: 'message',
        message: finalAnswer,
      },
    ]);
  });

  it('keeps process messages visible while the final answer is streaming', () => {
    const finalAnswer = buildMessage({
      id: 'final-answer',
      status: MessageStatus.STREAMING,
      message: {
        role: OpenAIMessageRole.ASSISTANT,
        content: 'In progress',
      },
    });

    expect(
      buildMessageDisplayItems([
        buildMessage({
          id: 'tool-message',
          message: { role: OpenAIMessageRole.TOOL },
        }),
        finalAnswer,
      ])
    ).toEqual([
      {
        type: 'message',
        message: expect.objectContaining({ id: 'tool-message' }),
      },
      {
        type: 'message',
        message: finalAnswer,
      },
    ]);
  });

  it('keeps terminal assistant messages visible until the stream is done', () => {
    const intermediateAnswer = buildMessage({
      id: 'intermediate-answer',
      message: {
        role: OpenAIMessageRole.ASSISTANT,
        content: 'I found one result. I will keep checking.',
      },
    });

    expect(
      buildMessageDisplayItems([
        buildMessage({
          id: 'tool-message',
          message: { role: OpenAIMessageRole.TOOL },
        }),
        intermediateAnswer,
      ])
    ).toEqual([
      {
        type: 'message',
        message: expect.objectContaining({ id: 'tool-message' }),
      },
      {
        type: 'message',
        message: intermediateAnswer,
      },
    ]);
  });

  it('collapses persisted history without frontend stream state', () => {
    const toolMessage = buildMessage({
      id: 'tool-message',
      created_at: '2026-07-04T10:00:00.000Z',
      message: { role: OpenAIMessageRole.TOOL },
    });
    const finalAnswer = buildMessage({
      id: 'final-answer',
      created_at: '2026-07-04T10:01:00.000Z',
      message: {
        role: OpenAIMessageRole.ASSISTANT,
        content: 'Done',
      },
    });

    expect(buildMessageDisplayItems([toolMessage, finalAnswer])).toEqual([
      {
        type: 'collapsed_process',
        messages: [toolMessage],
        finalMessage: finalAnswer,
      },
      {
        type: 'message',
        message: finalAnswer,
      },
    ]);
  });
});

describe('getCollapsedProcessDurationSeconds', () => {
  it('uses process start and final answer update timestamps', () => {
    expect(
      getCollapsedProcessDurationSeconds(
        [
          buildMessage({
            id: 'process',
            created_at: '2026-07-04T10:00:00.000Z',
          }),
        ],
        buildMessage({
          id: 'final',
          created_at: '2026-07-04T10:01:00.000Z',
          updated_at: '2026-07-04T10:02:08.000Z',
        })
      )
    ).toBe(128);
  });

  it('returns undefined when timestamps are missing', () => {
    expect(
      getCollapsedProcessDurationSeconds(
        [buildMessage({ id: 'process' })],
        buildMessage({ id: 'final' })
      )
    ).toBeUndefined();
  });
});
