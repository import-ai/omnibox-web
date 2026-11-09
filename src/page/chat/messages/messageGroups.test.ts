import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';
import {
  buildMessageDisplayItems,
  buildMessageIndexItems,
  getLegacyProcessDurationMs,
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

function displayIds(messages: MessageDetail[]) {
  return buildMessageDisplayItems(messages).map(item =>
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
      displayIds([
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
          status: MessageStatus.STREAMING,
          message: {
            role: OpenAIMessageRole.ASSISTANT,
            content: 'I found one result. I will keep checking.',
          },
        }),
      ])
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

  it('keeps tool decision messages inside the collapsed process', () => {
    expect(
      displayIds([
        buildMessage({
          id: 'assistant-tool-call',
          message: {
            role: OpenAIMessageRole.ASSISTANT,
            content: 'I will run a tool.',
            tool_calls: [
              {
                id: 'tool-call',
                type: 'function',
                function: { name: 'create_resource', arguments: '{}' },
              },
            ],
          },
        }),
        buildMessage({
          id: 'tool-decision',
          message: { role: OpenAIMessageRole.USER },
          attrs: {
            tool_call: { status: 'success', decisions: [{ type: 'approve' }] },
          },
        }),
        buildMessage({
          id: 'tool-message',
          message: { role: OpenAIMessageRole.TOOL },
        }),
        buildMessage({
          id: 'final-answer',
          message: { role: OpenAIMessageRole.ASSISTANT, content: 'Done' },
        }),
      ])
    ).toEqual([
      'process:assistant-tool-call,tool-decision,tool-message',
      'message:final-answer',
    ]);
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

describe('single-node reasoning process projection', () => {
  it.each([false, true])(
    'splits live and lazy reasoning without changing stored messages (lazy=%s)',
    lazy => {
      const source = buildMessage({
        id: 'single',
        has_reasoning: lazy,
        details_loaded: lazy ? false : undefined,
        message: {
          role: OpenAIMessageRole.ASSISTANT,
          content: 'final body',
          ...(lazy ? {} : { reasoning_content: 'thinking' }),
        },
      });
      const before = JSON.stringify(source);
      const items = buildMessageDisplayItems([source]);
      expect(items).toHaveLength(2);
      expect(items[0].type).toBe('collapsed_process');
      if (items[0].type !== 'collapsed_process' || items[1].type !== 'message')
        throw new Error('wrong projection');
      expect(items[0].finalMessage).toBe(source);
      expect(items[0].messages[0].id).toBe(source.id);
      expect(items[0].messages[0].message.content).toBeUndefined();
      expect(items[1].message.message.content).toBe('final body');
      expect(items[1].message.message.reasoning_content).toBeUndefined();
      expect(items[1].message.has_reasoning).toBe(false);
      expect(JSON.stringify(source)).toBe(before);
    }
  );
});

describe('legacy process duration compatibility', () => {
  it('preserves existing multi-step timing but never invents single-node or invalid timing', () => {
    const first = buildMessage({
      id: 'first',
      created_at: '2026-11-09T00:00:00Z',
    });
    const final = buildMessage({
      id: 'final',
      created_at: '2026-11-09T00:00:19Z',
      updated_at: '2026-11-10T00:00:00Z',
    });
    expect(getLegacyProcessDurationMs([first], final)).toBe(19000);
    expect(getLegacyProcessDurationMs([final], final)).toBeUndefined();
    expect(
      getLegacyProcessDurationMs([first], {
        ...final,
        attrs: { answer_timing: {} } as MessageDetail['attrs'],
      })
    ).toBeUndefined();
    expect(
      getLegacyProcessDurationMs([first], {
        ...final,
        status: MessageStatus.STOPPED,
      })
    ).toBeUndefined();
    expect(
      getLegacyProcessDurationMs([first], { ...final, created_at: 'invalid' })
    ).toBeUndefined();
    expect(
      getLegacyProcessDurationMs([first], {
        ...final,
        created_at: first.created_at,
      })
    ).toBeUndefined();
    expect(getLegacyProcessDurationMs([final], first)).toBeUndefined();
  });
});

describe('stopped message projections', () => {
  it.each([
    ['', 'thought'],
    ['partial body', 'thought'],
    ['', ''],
    ['partial body', ''],
  ])(
    'keeps stopped process with body=%s and reasoning=%s',
    (content, reasoning) => {
      const source = buildMessage({
        id: 'stopped',
        status: MessageStatus.STOPPED,
        message: {
          role: OpenAIMessageRole.ASSISTANT,
          content,
          reasoning_content: reasoning,
        },
      });
      const before = JSON.stringify(source);
      const items = buildMessageDisplayItems([source]);
      expect(items[0].type).toBe('collapsed_process');
      if (items[0].type !== 'collapsed_process')
        throw new Error('missing stopped disclosure');
      expect(items[0].messages).toHaveLength(1);
      expect(items[0].messages[0].message.content).toBeUndefined();
      expect(items[0].messages[0].message.reasoning_content).toBe(reasoning);
      expect(items.filter(x => x.type === 'message')).toHaveLength(
        content ? 1 : 0
      );
      expect(JSON.stringify(source)).toBe(before);
    }
  );
});
