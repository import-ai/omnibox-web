import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';
import { ToolCallStatus } from '../core/types/toolCall';
import {
  findDecisionForAssistant,
  interruptedToolCallDisplayStatus,
  interruptedToolCallIds,
  resolveDecisionTurn,
} from './decisionTurn';
import { isTerminalToolCallStatus } from './role/assistantMessageUtils';

function message(
  id: string,
  overrides: Partial<MessageDetail> = {}
): MessageDetail {
  return {
    id,
    clientKey: 0,
    parent_id: '',
    children: [],
    status: MessageStatus.SUCCESS,
    message: { role: OpenAIMessageRole.ASSISTANT },
    ...overrides,
  } as MessageDetail;
}

function question(id = 'q'): MessageDetail {
  return message(id, {
    message: { role: OpenAIMessageRole.USER, content: 'edit the doc' },
  });
}

function interruptAssistant(
  calls: { id: string; name: string; args: string }[],
  overrides: Partial<MessageDetail> = {}
): MessageDetail {
  const parsed = calls.map(call => JSON.parse(call.args));
  return message('a', {
    parent_id: 'q',
    children: ['d'],
    message: {
      role: OpenAIMessageRole.ASSISTANT,
      tool_calls: calls.map(call => ({
        id: call.id,
        type: 'function' as const,
        function: { name: call.name, arguments: call.args },
      })),
    },
    attrs: {
      tool_call: {
        status: 'pending',
        interrupts: calls.map((call, index) => ({
          name: call.name,
          args: parsed[index],
          decisions: ['approve', 'reject'],
        })),
      },
    },
    ...overrides,
  });
}

function decision(
  decisions: { type: 'approve' | 'reject' }[] = [{ type: 'approve' }],
  overrides: Partial<MessageDetail> = {}
): MessageDetail {
  return message('d', {
    parent_id: 'a',
    message: { role: OpenAIMessageRole.USER, content: '' },
    attrs: { tool_call: { status: 'success', decisions } },
    ...overrides,
  });
}

function toolResult(
  toolCallId: string,
  overrides: Partial<MessageDetail> = {}
): MessageDetail {
  return message(`tool-${toolCallId}`, {
    parent_id: 'd',
    status: MessageStatus.SUCCESS,
    message: {
      role: OpenAIMessageRole.TOOL,
      tool_call_id: toolCallId,
      content: 'done',
    },
    attrs: {
      tool_call: { status: ToolCallStatus.SUCCESS },
    } as MessageDetail['attrs'],
    ...overrides,
  });
}

const singleCall = [
  { id: 'call-1', name: 'edit_resource', args: '{"id":"r1"}' },
];
const twoCalls = [
  { id: 'call-1', name: 'edit_resource', args: '{"id":"r1"}' },
  { id: 'call-2', name: 'edit_resource', args: '{"id":"r2"}' },
];

describe('findDecisionForAssistant', () => {
  it('finds the user decision child', () => {
    const assistant = interruptAssistant(singleCall);
    const d = decision();
    expect(
      findDecisionForAssistant(assistant, [question(), assistant, d])
    ).toBe(d);
  });

  it('returns undefined while the interrupt awaits a decision', () => {
    const assistant = interruptAssistant(singleCall);
    expect(findDecisionForAssistant(assistant, [question(), assistant])).toBe(
      undefined
    );
  });
});

describe('interruptedToolCallIds', () => {
  it('matches interrupts to calls by name and parsed arguments', () => {
    expect(interruptedToolCallIds(interruptAssistant(twoCalls))).toEqual([
      'call-1',
      'call-2',
    ]);
  });

  it('is undefined when a call cannot be matched', () => {
    const assistant = interruptAssistant(singleCall);
    assistant.message.tool_calls = [];
    expect(interruptedToolCallIds(assistant)).toBeUndefined();
    expect(interruptedToolCallIds(undefined)).toBeUndefined();
  });
});

describe('resolveDecisionTurn', () => {
  const assistant = interruptAssistant(singleCall);

  it('sends a pending local decision', () => {
    const d = decision(undefined, { status: MessageStatus.PENDING });
    expect(resolveDecisionTurn(d, [question(), assistant, d]).state).toBe(
      'sending'
    );
  });

  it('is failed when the decision message itself failed to send', () => {
    const d = decision(undefined, { status: MessageStatus.FAILED });
    expect(resolveDecisionTurn(d, [question(), assistant, d]).state).toBe(
      'failed'
    );
  });

  it('executes with no result yet', () => {
    const d = decision();
    expect(resolveDecisionTurn(d, [question(), assistant, d])).toMatchObject({
      state: 'executing',
      hasApprove: true,
      canRetry: false,
    });
  });

  it('executes while a tool result runs', () => {
    const d = decision();
    const tool = toolResult('call-1', {
      status: MessageStatus.STREAMING,
      attrs: { tool_call: { status: ToolCallStatus.RUNNING } },
    });
    expect(resolveDecisionTurn(d, [question(), assistant, d, tool]).state).toBe(
      'executing'
    );
  });

  it('completes on a successful tool result', () => {
    const d = decision();
    const tool = toolResult('call-1');
    expect(
      resolveDecisionTurn(d, [question(), assistant, d, tool])
    ).toMatchObject({ state: 'completed', hasApprove: true });
  });

  it('completes on a rejected tool result and reports it', () => {
    const d = decision([{ type: 'reject' }]);
    const tool = toolResult('call-1', {
      attrs: { tool_call: { status: ToolCallStatus.REJECTED } },
    });
    expect(
      resolveDecisionTurn(d, [question(), assistant, d, tool])
    ).toMatchObject({
      state: 'completed',
      hasApprove: false,
      hasRejectedResult: true,
    });
  });

  it('keeps a multi-call batch executing until every call has a result', () => {
    const batch = interruptAssistant(twoCalls);
    const d = decision();
    const first = toolResult('call-1', { parent_id: 'd' });
    expect(resolveDecisionTurn(d, [question(), batch, d, first]).state).toBe(
      'executing'
    );
    const second = toolResult('call-2', { parent_id: first.id });
    expect(
      resolveDecisionTurn(d, [question(), batch, d, first, second]).state
    ).toBe('completed');
  });

  it('fails on a failed tool result', () => {
    const d = decision();
    const tool = toolResult('call-1', {
      status: MessageStatus.FAILED,
      attrs: { tool_call: { status: ToolCallStatus.FAILED } },
    });
    expect(
      resolveDecisionTurn(d, [question(), assistant, d, tool])
    ).toMatchObject({ state: 'failed', canRetry: false });
  });

  it('ignores a failed tool call that was not interrupted', () => {
    const d = decision();
    const other = toolResult('call-other', {
      status: MessageStatus.FAILED,
      attrs: {
        tool_call: { status: ToolCallStatus.FAILED },
      } as MessageDetail['attrs'],
    });
    const tool = toolResult('call-1');
    expect(
      resolveDecisionTurn(d, [question(), assistant, d, other, tool]).state
    ).toBe('completed');
  });

  it('falls back to the decision-turn results when the assistant is not loaded', () => {
    const d = decision();
    const tool = toolResult('call-1');
    expect(resolveDecisionTurn(d, [d, tool]).state).toBe('completed');
    const failed = toolResult('call-1', {
      attrs: { tool_call: { status: ToolCallStatus.FAILED } },
    });
    expect(resolveDecisionTurn(d, [d, failed]).state).toBe('failed');
  });

  it('retries a failed resume with only failed empty replies', () => {
    const d = decision();
    const failed = message('failed', {
      parent_id: 'd',
      status: MessageStatus.FAILED,
      message: { role: OpenAIMessageRole.ASSISTANT, content: '' },
    });
    expect(
      resolveDecisionTurn(d, [question(), assistant, d, failed])
    ).toMatchObject({ state: 'failed', canRetry: true });
  });

  it('does not retry when the failed reply carries content', () => {
    const d = decision();
    const failed = message('failed', {
      parent_id: 'd',
      status: MessageStatus.FAILED,
      message: { role: OpenAIMessageRole.ASSISTANT, content: 'boom' },
    });
    expect(
      resolveDecisionTurn(d, [question(), assistant, d, failed]).canRetry
    ).toBe(false);
  });

  it('reports unknown for a result carrying the turn error marker', () => {
    const d = decision();
    // The backend force-fails the open row: attrs failed plus the turn marker.
    const tool = toolResult('call-1', {
      status: MessageStatus.FAILED,
      attrs: {
        tool_call: { status: ToolCallStatus.FAILED },
        error_message: 'upstream gateway timeout',
        error_code: 'upstream_timeout',
      },
    });
    expect(
      resolveDecisionTurn(d, [question(), assistant, d, tool])
    ).toMatchObject({ state: 'unknown', canRetry: false });
  });

  it('reports unknown from the segment fallback too', () => {
    const d = decision();
    const tool = toolResult('call-1', {
      attrs: {
        tool_call: { status: ToolCallStatus.SUCCESS },
        error_code: 'stream_connection_failed',
      },
    });
    expect(resolveDecisionTurn(d, [d, tool]).state).toBe('unknown');
  });

  it('keeps a genuine tool failure failed without the marker', () => {
    const d = decision();
    const tool = toolResult('call-1', {
      attrs: { tool_call: { status: ToolCallStatus.FAILED } },
    });
    expect(resolveDecisionTurn(d, [question(), assistant, d, tool]).state).toBe(
      'failed'
    );
  });

  it('reports stopped for a stopped result, turn marker or persisted stop', () => {
    const d = decision();
    const stoppedTool = toolResult('call-1', {
      status: MessageStatus.STOPPED,
      attrs: { tool_call: { status: ToolCallStatus.STOPPED } },
    });
    expect(
      resolveDecisionTurn(d, [question(), assistant, d, stoppedTool]).state
    ).toBe('stopped');
    expect(
      resolveDecisionTurn(
        decision(undefined, { status: MessageStatus.STOPPED }),
        [question(), assistant]
      ).state
    ).toBe('stopped');
    const stoppedRun = decision(undefined, {
      attrs: {
        tool_call: { status: 'success', decisions: [{ type: 'approve' }] },
        stopped_runs: ['run-1'],
      },
    });
    expect(
      resolveDecisionTurn(stoppedRun, [question(), assistant, stoppedRun]).state
    ).toBe('stopped');
  });

  it('lets a later successful retry win over a stale stop marker', () => {
    const d = decision(undefined, {
      attrs: {
        tool_call: { status: 'success', decisions: [{ type: 'approve' }] },
        stopped_runs: ['run-1'],
      },
    });
    const tool = toolResult('call-1');
    expect(resolveDecisionTurn(d, [question(), assistant, d, tool]).state).toBe(
      'completed'
    );
  });

  it('completes when the turn settled with a final answer', () => {
    const d = decision();
    const answer = message('answer', {
      parent_id: 'd',
      message: { role: OpenAIMessageRole.ASSISTANT, content: 'done' },
    });
    expect(
      resolveDecisionTurn(d, [question(), assistant, d, answer]).state
    ).toBe('completed');
  });
});

describe('interruptedToolCallDisplayStatus', () => {
  const assistant = interruptAssistant(singleCall);

  it('keeps the warning before a decision exists', () => {
    expect(interruptedToolCallDisplayStatus(undefined, [], false)).toBe(
      ToolCallStatus.INTERRUPTED
    );
    const failed = decision(undefined, { status: MessageStatus.FAILED });
    expect(
      interruptedToolCallDisplayStatus(failed, [assistant, failed], false)
    ).toBe(ToolCallStatus.INTERRUPTED);
  });

  it('shows working after the decision and while busy', () => {
    const d = decision();
    const messages = [question(), assistant, d];
    expect(interruptedToolCallDisplayStatus(d, messages, false)).toBe(
      ToolCallStatus.RUNNING
    );
    const failedResume = message('failed', {
      parent_id: 'd',
      status: MessageStatus.FAILED,
      message: { role: OpenAIMessageRole.ASSISTANT, content: '' },
    });
    expect(
      interruptedToolCallDisplayStatus(d, [...messages, failedResume], true)
    ).toBe(ToolCallStatus.RUNNING);
  });

  it('maps the derived state to the row status', () => {
    const d = decision();
    const failedResume = message('failed', {
      parent_id: 'd',
      status: MessageStatus.FAILED,
      message: { role: OpenAIMessageRole.ASSISTANT, content: '' },
    });
    expect(
      interruptedToolCallDisplayStatus(
        d,
        [question(), assistant, d, failedResume],
        false
      )
    ).toBe(ToolCallStatus.FAILED);
    const stopped = decision(undefined, {
      attrs: {
        tool_call: { status: 'success', decisions: [{ type: 'approve' }] },
        stopped_runs: ['run-1'],
      },
    });
    expect(
      interruptedToolCallDisplayStatus(
        stopped,
        [question(), assistant, stopped],
        false
      )
    ).toBe(ToolCallStatus.STOPPED);
    const unknown = decision();
    const tool = toolResult('call-1', {
      attrs: {
        tool_call: { status: ToolCallStatus.FAILED },
        error_message: 'timeout',
      },
    });
    expect(
      interruptedToolCallDisplayStatus(
        unknown,
        [question(), assistant, unknown, tool],
        false
      )
    ).toBe(ToolCallStatus.UNKNOWN);
  });

  it('treats UNKNOWN as terminal so the spinner stops', () => {
    expect(isTerminalToolCallStatus(ToolCallStatus.UNKNOWN)).toBe(true);
  });
});
