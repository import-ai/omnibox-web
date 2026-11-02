import {
  MessageStatus,
  OpenAIMessageRole,
} from '../../core/types/chatResponse';
import type { MessageDetail } from '../../core/types/conversation';
import { ToolCallStatus } from '../../core/types/toolCall';
import {
  findToolMessageForToolCall,
  getLatestContextCompactCapacity,
  isTerminalToolCallStatus,
  isToolTurnStopped,
  resolveToolCallStatus,
} from './assistantMessageUtils';

function buildMessage(
  overrides: Partial<MessageDetail> & Pick<MessageDetail, 'id'>
): MessageDetail {
  return {
    message: {
      role: OpenAIMessageRole.TOOL,
      tool_call_id: 'tool-call-1',
    },
    status: MessageStatus.SUCCESS,
    parent_id: 'parent',
    children: [],
    ...overrides,
  };
}

describe('findToolMessageForToolCall', () => {
  it('matches tool messages by role and tool_call_id without requiring success status', () => {
    const failedToolMessage = buildMessage({
      id: 'tool-message-failed',
      status: MessageStatus.FAILED,
      attrs: {
        tool_call: {
          status: ToolCallStatus.FAILED,
        },
      },
    });
    const messages = [
      buildMessage({
        id: 'assistant-message',
        message: {
          role: OpenAIMessageRole.ASSISTANT,
          tool_call_id: 'tool-call-1',
        },
      }),
      failedToolMessage,
    ];

    expect(findToolMessageForToolCall(messages, 'tool-call-1')).toBe(
      failedToolMessage
    );
  });
});

describe('resolveToolCallStatus', () => {
  it.each([
    ToolCallStatus.SUCCESS,
    ToolCallStatus.FAILED,
    ToolCallStatus.REJECTED,
  ])('uses terminal attrs.tool_call.status %s as authoritative', status => {
    const toolMessage = buildMessage({
      id: `tool-message-${status}`,
      status: MessageStatus.FAILED,
      attrs: {
        tool_call: {
          status,
        },
      },
    });

    expect(resolveToolCallStatus(toolMessage)).toBe(status);
  });

  it('uses successful message status when tool attrs are non-terminal', () => {
    const toolMessage = buildMessage({
      id: 'tool-message-running',
      status: MessageStatus.SUCCESS,
      attrs: {
        tool_call: {
          status: ToolCallStatus.PENDING,
        },
      },
    });

    expect(resolveToolCallStatus(toolMessage)).toBe(ToolCallStatus.SUCCESS);
  });

  it('falls back to pending when there is no matching tool message', () => {
    expect(resolveToolCallStatus()).toBe(ToolCallStatus.PENDING);
  });
});

describe('isTerminalToolCallStatus', () => {
  it.each([
    ToolCallStatus.SUCCESS,
    ToolCallStatus.FAILED,
    ToolCallStatus.REJECTED,
  ])('returns true for terminal status %s', status => {
    expect(isTerminalToolCallStatus(status)).toBe(true);
  });

  it.each([ToolCallStatus.PENDING, ToolCallStatus.RUNNING])(
    'returns false for non-terminal status %s',
    status => {
      expect(isTerminalToolCallStatus(status)).toBe(false);
    }
  );
});

describe('getLatestContextCompactCapacity', () => {
  function buildAssistantMessage(
    overrides: Partial<MessageDetail> & Pick<MessageDetail, 'id'>
  ): MessageDetail {
    return buildMessage({
      message: {
        role: OpenAIMessageRole.ASSISTANT,
      },
      ...overrides,
    });
  }

  it('uses the latest completed assistant compact estimate and clamps percent', () => {
    const messages = [
      buildAssistantMessage({
        id: 'old-message',
        attrs: {
          usage: {
            total_tokens: 20,
            context_compact: { estimated_tokens: 20, trigger_tokens: 100 },
          },
        },
      }),
      buildAssistantMessage({
        id: 'latest-message',
        attrs: {
          usage: {
            total_tokens: 120,
            context_compact: { estimated_tokens: 120, trigger_tokens: 100 },
          },
        },
      }),
    ];

    expect(getLatestContextCompactCapacity(messages)).toEqual({
      estimatedTokens: 120,
      triggerTokens: 100,
      percent: 100,
    });
  });

  it('returns undefined without estimated and trigger tokens', () => {
    const messages = [
      buildAssistantMessage({
        id: 'message',
        attrs: {
          usage: {
            total_tokens: 120,
            context_compact: { trigger_tokens: 100 },
          },
        },
      }),
    ];

    expect(getLatestContextCompactCapacity(messages)).toBeUndefined();
  });

  it('does not fall back past the latest completed assistant message', () => {
    const messages = [
      buildAssistantMessage({
        id: 'old-pro-message',
        attrs: {
          usage: {
            context_compact: { estimated_tokens: 20, trigger_tokens: 100 },
          },
        },
      }),
      buildAssistantMessage({
        id: 'latest-basic-message',
      }),
    ];

    expect(getLatestContextCompactCapacity(messages)).toBeUndefined();
  });

  it('ignores streaming assistant messages', () => {
    const messages = [
      buildAssistantMessage({
        id: 'completed-message',
        attrs: {
          usage: {
            context_compact: { estimated_tokens: 20, trigger_tokens: 100 },
          },
        },
      }),
      buildAssistantMessage({
        id: 'streaming-message',
        status: MessageStatus.STREAMING,
      }),
    ];

    expect(getLatestContextCompactCapacity(messages)).toEqual({
      estimatedTokens: 20,
      triggerTokens: 100,
      percent: 20,
    });
  });
});

const row = (
  id: string,
  role = OpenAIMessageRole.ASSISTANT,
  status = MessageStatus.SUCCESS,
  attrs = {}
): MessageDetail =>
  ({
    id,
    clientKey: 0,
    message: { role },
    status,
    parent_id: '',
    children: [],
    attrs,
  }) as MessageDetail;

describe('stopped tool lifecycle', () => {
  it('recognizes stopped rows without tool attrs', () => {
    expectEqual(
      resolveToolCallStatus(
        row('tool', OpenAIMessageRole.TOOL, MessageStatus.STOPPED)
      ),
      ToolCallStatus.STOPPED
    );
  });
  it('preserves completed tool outcomes when the turn stops', () => {
    for (const status of [
      ToolCallStatus.SUCCESS,
      ToolCallStatus.FAILED,
      ToolCallStatus.REJECTED,
    ]) {
      expectEqual(
        resolveToolCallStatus(
          row('tool', OpenAIMessageRole.TOOL, MessageStatus.SUCCESS, {
            tool_call: { status },
          }),
          true
        ),
        status
      );
    }
  });
  it('stops unmatched calls only with turn cancellation evidence', () => {
    expectEqual(resolveToolCallStatus(undefined, true), ToolCallStatus.STOPPED);
    expectEqual(resolveToolCallStatus(), ToolCallStatus.PENDING);
  });
  it('does not infer cancellation from a completed tool-issuing assistant', () => {
    expectEqual(
      isToolTurnStopped([row('q', OpenAIMessageRole.USER), row('a')], 'a'),
      false
    );
  });
  it('recognizes a historical orphan stopped message but isolates the next turn', () => {
    const messages = [
      row('q', OpenAIMessageRole.USER),
      row('a'),
      row('orphan', OpenAIMessageRole.TOOL, MessageStatus.STOPPED),
      row('q2', OpenAIMessageRole.USER),
      row('a2'),
    ];
    expectEqual(isToolTurnStopped(messages, 'a'), true);
    expectEqual(isToolTurnStopped(messages, 'a2'), false);
  });
  it('uses a persisted assistant turn marker when no tool row was created', () => {
    expectEqual(
      isToolTurnStopped(
        [
          row('q', OpenAIMessageRole.USER),
          row('a', OpenAIMessageRole.ASSISTANT, MessageStatus.SUCCESS, {
            turn_status: 'stopped',
          }),
        ],
        'a'
      ),
      true
    );
  });
});

function expectEqual(actual: unknown, expected: unknown) {
  expect(actual).toBe(expected);
}

test('a new approval run does not inherit an earlier run cancellation', () => {
  const old = row('old', OpenAIMessageRole.ASSISTANT, MessageStatus.SUCCESS, {
    turn_run_id: 'run-1',
    turn_status: 'stopped',
    stopped_run_id: 'run-1',
  });
  const current = row(
    'current',
    OpenAIMessageRole.TOOL,
    MessageStatus.STREAMING,
    { turn_run_id: 'run-2' }
  );
  expect(
    isToolTurnStopped([row('q', OpenAIMessageRole.USER), old, current], 'old')
  ).toBe(false);
});
test('the latest retry tool message wins over a stopped earlier attempt', () => {
  const old = buildMessage({ id: 'old', status: MessageStatus.STOPPED });
  const current = buildMessage({
    id: 'current',
    status: MessageStatus.STREAMING,
  });
  expect(findToolMessageForToolCall([old, current], 'tool-call-1')).toBe(
    current
  );
});
