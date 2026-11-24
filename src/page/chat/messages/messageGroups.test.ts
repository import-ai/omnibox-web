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

function proUser(id = 'user') {
  return buildMessage({
    id,
    message: { role: OpenAIMessageRole.USER, content: 'Question?' },
    attrs: { edition: 'pro' },
  });
}

function basicUser(id = 'user') {
  return buildMessage({
    id,
    message: { role: OpenAIMessageRole.USER, content: 'Question?' },
    attrs: { edition: 'basic' },
  });
}

function toolCallAssistant(id: string, overrides: Partial<MessageDetail> = {}) {
  return buildMessage({
    id,
    ...overrides,
    message: {
      role: OpenAIMessageRole.ASSISTANT,
      reasoning_content: 'thinking',
      tool_calls: [
        {
          id: 'tool-call',
          type: 'function',
          function: { name: 'web_search', arguments: '{}' },
        },
      ],
    },
  });
}

function toolResult(id: string, overrides: Partial<MessageDetail> = {}) {
  return buildMessage({
    id,
    ...overrides,
    message: { role: OpenAIMessageRole.TOOL, tool_call_id: 'tool-call' },
  });
}

function answer(
  id: string,
  content: string,
  overrides: Partial<MessageDetail> = {}
) {
  return buildMessage({
    id,
    ...overrides,
    message: { role: OpenAIMessageRole.ASSISTANT, content },
  });
}

function describeItems(messages: MessageDetail[]) {
  return buildMessageDisplayItems(messages).map(item =>
    item.type === 'message'
      ? {
          type: 'message' as const,
          id: item.message.id,
          suppressProcessUi: Boolean(item.suppressProcessUi),
        }
      : {
          type: 'process' as const,
          ids: item.messages.map(message => message.id),
          finalMessageId: item.finalMessage.id,
          running: item.running,
        }
  );
}

describe('agent 2.1 turns hide the process while streaming', () => {
  it('collapses a running tool round before any answer arrives', () => {
    expect(
      describeItems([
        proUser(),
        toolCallAssistant('assistant-tool-call', {
          status: MessageStatus.STREAMING,
        }),
        toolResult('tool-message'),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['assistant-tool-call', 'tool-message'],
        finalMessageId: 'tool-message',
        running: true,
      },
    ]);
  });

  it('shows the answer growing while the finished process stays collapsed', () => {
    expect(
      describeItems([
        proUser(),
        toolCallAssistant('assistant-tool-call'),
        toolResult('tool-message'),
        answer('final-answer', 'Partial', { status: MessageStatus.STREAMING }),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['assistant-tool-call', 'tool-message'],
        finalMessageId: 'final-answer',
        running: false,
      },
      { type: 'message', id: 'final-answer', suppressProcessUi: true },
    ]);
  });

  it('collapses a single process message', () => {
    expect(describeItems([proUser(), toolResult('tool-message')])).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['tool-message'],
        finalMessageId: 'tool-message',
        running: false,
      },
    ]);
  });

  it('moves superseded answer text into the process', () => {
    expect(
      describeItems([
        proUser(),
        answer('draft-answer', 'Let me check that.'),
        toolCallAssistant('assistant-tool-call'),
        toolResult('tool-message'),
        answer('final-answer', 'Done'),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['draft-answer', 'assistant-tool-call', 'tool-message'],
        finalMessageId: 'final-answer',
        running: false,
      },
      { type: 'message', id: 'final-answer', suppressProcessUi: true },
    ]);
  });

  it('keeps the stopped partial answer visible', () => {
    expect(
      describeItems([
        proUser(),
        toolCallAssistant('assistant-tool-call'),
        toolResult('tool-message'),
        answer('final-answer', 'Partial', { status: MessageStatus.STOPPED }),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['assistant-tool-call', 'tool-message'],
        finalMessageId: 'final-answer',
        running: false,
      },
      { type: 'message', id: 'final-answer', suppressProcessUi: true },
    ]);
  });

  it('keeps failures and compaction dividers outside the collapsed process', () => {
    expect(
      describeItems([
        proUser(),
        toolCallAssistant('assistant-tool-call'),
        toolResult('tool-message'),
        buildMessage({
          id: 'compacted',
          message: { role: OpenAIMessageRole.ASSISTANT },
          attrs: { compact: { status: 'compacted' } },
        }),
        answer('failed-answer', 'Half', {
          status: MessageStatus.FAILED,
          attrs: { error_message: 'boom' },
        }),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['assistant-tool-call', 'tool-message'],
        finalMessageId: 'failed-answer',
        running: false,
      },
      { type: 'message', id: 'compacted', suppressProcessUi: false },
      { type: 'message', id: 'failed-answer', suppressProcessUi: true },
    ]);
  });

  it('keeps a failed process message visible when it holds no answer text', () => {
    expect(
      describeItems([
        proUser(),
        toolCallAssistant('assistant-tool-call'),
        toolResult('tool-message', {
          status: MessageStatus.FAILED,
          attrs: { error_message: 'tool failed' },
        }),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['assistant-tool-call'],
        finalMessageId: 'assistant-tool-call',
        running: false,
      },
      { type: 'message', id: 'tool-message', suppressProcessUi: false },
    ]);
  });

  it('keeps agent 1.1 and edition-less history on the legacy layout', () => {
    const legacyTurn = (user: MessageDetail) => [
      user,
      toolResult('tool-message'),
      answer('final-answer', 'In progress', {
        status: MessageStatus.STREAMING,
      }),
    ];
    expect(describeItems(legacyTurn(basicUser()))).toEqual(
      describeItems(
        legacyTurn(
          buildMessage({
            id: 'user',
            message: { role: OpenAIMessageRole.USER, content: 'Question?' },
          })
        )
      )
    );
    expect(describeItems(legacyTurn(basicUser()))).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      { type: 'message', id: 'tool-message', suppressProcessUi: false },
      { type: 'message', id: 'final-answer', suppressProcessUi: false },
    ]);
  });

  it('keeps the answer reasoning inside the collapsed process', () => {
    const source = buildMessage({
      id: 'final-answer',
      message: {
        role: OpenAIMessageRole.ASSISTANT,
        content: 'Done',
        reasoning_content: 'thinking',
      },
    });
    const before = JSON.stringify(source);
    const items = buildMessageDisplayItems([proUser(), source]);
    expect(items).toHaveLength(3);
    const process = items[1];
    if (process.type !== 'collapsed_process') throw new Error('no process');
    expect(process.messages).toHaveLength(1);
    expect(process.messages[0].message.content).toBeUndefined();
    expect(process.messages[0].message.reasoning_content).toBe('thinking');
    expect(items[2]).toMatchObject({
      type: 'message',
      suppressProcessUi: true,
      message: { message: { content: 'Done' } },
    });
    expect(JSON.stringify(source)).toBe(before);
  });

  it('keeps a later tool round reporting progress after an answer exists', () => {
    expect(
      describeItems([
        proUser(),
        toolCallAssistant('assistant-tool-call'),
        toolResult('tool-message'),
        answer('draft-answer', 'Let me check that.'),
        toolCallAssistant('next-tool-call', {
          status: MessageStatus.STREAMING,
        }),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['assistant-tool-call', 'tool-message'],
        finalMessageId: 'draft-answer',
        running: false,
      },
      { type: 'message', id: 'draft-answer', suppressProcessUi: true },
      {
        type: 'process',
        ids: ['next-tool-call'],
        finalMessageId: 'draft-answer',
        running: true,
      },
    ]);
  });

  it('uses the marked answer phase before any answer text arrives', () => {
    expect(
      describeItems([
        proUser(),
        toolCallAssistant('assistant-tool-call'),
        toolResult('tool-message'),
        buildMessage({
          id: 'answer',
          status: MessageStatus.STREAMING,
          message: { role: OpenAIMessageRole.ASSISTANT },
          attrs: { answer_phase: 'answer' },
        }),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['assistant-tool-call', 'tool-message'],
        finalMessageId: 'answer',
        running: false,
      },
      { type: 'message', id: 'answer', suppressProcessUi: true },
    ]);
  });

  it('keeps unmarked interim text in the process when an answer is marked', () => {
    expect(
      describeItems([
        proUser(),
        answer('interim', 'Let me check that.'),
        toolCallAssistant('assistant-tool-call'),
        toolResult('tool-message'),
        buildMessage({
          id: 'answer',
          status: MessageStatus.STREAMING,
          message: { role: OpenAIMessageRole.ASSISTANT, content: 'Done' },
          attrs: { answer_phase: 'answer' },
        }),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['interim', 'assistant-tool-call', 'tool-message'],
        finalMessageId: 'answer',
        running: false,
      },
      { type: 'message', id: 'answer', suppressProcessUi: true },
    ]);
  });

  it('keeps unmarked interim text out of the reply area while a phased turn runs', () => {
    expect(
      describeItems([
        proUser(),
        buildMessage({
          id: 'interim',
          status: MessageStatus.STREAMING,
          message: {
            role: OpenAIMessageRole.ASSISTANT,
            content: 'Let me check that.',
          },
          attrs: { answer_phase: 'process' },
        }),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['interim'],
        finalMessageId: 'interim',
        running: true,
      },
    ]);
  });

  it('keeps process text hidden across EOS and streams only the marked answer', () => {
    const query = proUser();
    const interim = answer('interim', 'Let me check that.', {
      status: MessageStatus.STREAMING,
      attrs: { answer_phase: 'process' },
    });
    const ended = { ...interim, status: MessageStatus.SUCCESS };
    const starting = answer('final', '', {
      status: MessageStatus.PENDING,
      attrs: { answer_phase: 'answer' },
    });
    const streaming = answer('final', 'Done', {
      status: MessageStatus.STREAMING,
      attrs: { answer_phase: 'answer' },
    });

    for (const [messages, visibleIds] of [
      [[query, interim], ['user']],
      [[query, ended], ['user']],
      [
        [query, ended, starting],
        ['user', 'final'],
      ],
      [
        [query, ended, streaming],
        ['user', 'final'],
      ],
    ] as const) {
      expect(
        describeItems([...messages])
          .filter(item => item.type === 'message')
          .map(item => item.id)
      ).toEqual(visibleIds);
    }
  });

  it('treats an image-only prompt as a pro turn', () => {
    expect(
      describeItems([
        buildMessage({
          id: 'user',
          message: { role: OpenAIMessageRole.USER },
          attrs: { edition: 'pro' },
        }),
        toolCallAssistant('assistant-tool-call'),
        toolResult('tool-message'),
        answer('final-answer', 'Done'),
      ])
    ).toEqual([
      { type: 'message', id: 'user', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['assistant-tool-call', 'tool-message'],
        finalMessageId: 'final-answer',
        running: false,
      },
      { type: 'message', id: 'final-answer', suppressProcessUi: true },
    ]);
  });

  it('keeps the previous turn intact when an image-only prompt follows', () => {
    expect(
      describeItems([
        proUser('user-1'),
        answer('answer-1', 'First'),
        buildMessage({
          id: 'user-2',
          message: { role: OpenAIMessageRole.USER },
          attrs: { edition: 'pro' },
        }),
        toolResult('tool-2'),
        answer('answer-2', 'Second'),
      ])
    ).toEqual([
      { type: 'message', id: 'user-1', suppressProcessUi: false },
      { type: 'message', id: 'answer-1', suppressProcessUi: true },
      { type: 'message', id: 'user-2', suppressProcessUi: false },
      {
        type: 'process',
        ids: ['tool-2'],
        finalMessageId: 'answer-2',
        running: false,
      },
      { type: 'message', id: 'answer-2', suppressProcessUi: true },
    ]);
  });

  it('pairs the index with the answer of a pro turn', () => {
    expect(
      buildMessageIndexItems([
        proUser(),
        toolCallAssistant('assistant-tool-call'),
        toolResult('tool-message'),
        answer('final-answer', 'Answer.'),
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
