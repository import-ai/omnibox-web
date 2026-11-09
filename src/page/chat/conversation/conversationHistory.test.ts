import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type {
  AnswerTiming,
  ConversationDetail,
  MessageDetail,
} from '../core/types/conversation';
import { hasToolCalls, mergeHistoryPage } from './conversationHistory';

const message = (
  id: string,
  extra: Partial<MessageDetail> = {}
): MessageDetail => ({
  id,
  clientKey: 1,
  parent_id: '',
  children: [],
  status: MessageStatus.SUCCESS,
  message: { role: OpenAIMessageRole.ASSISTANT, content: 'answer' },
  updated_at: '2026-10-03',
  ...extra,
});
const page = (
  mapping: Record<string, MessageDetail>,
  extra: Partial<ConversationDetail> = {}
): ConversationDetail => ({
  id: 'conversation',
  mapping,
  offset: 0,
  limit: 10,
  total: 30,
  has_more: true,
  ...extra,
});

test('merges pages without dropping details, old history or stable keys', () => {
  const detailed = message('latest', {
    details_loaded: true,
    message: { role: OpenAIMessageRole.ASSISTANT, reasoning_content: 'loaded' },
  });
  const previous = page(
    { latest: detailed, old: message('old') },
    { offset: 20, has_more: false }
  );
  const merged = mergeHistoryPage(
    previous,
    page({ latest: message('latest') })
  );
  expect(merged.mapping.latest.message.reasoning_content).toBe('loaded');
  expect(merged.mapping.old).toBeDefined();
  expect(merged.offset).toBe(20);
  expect(merged.has_more).toBe(false);
  expect(
    mergeHistoryPage(
      previous,
      page({ alternative: message('alternative') }),
      true
    ).mapping.old
  ).toBeUndefined();
});

test('does not overwrite an SSE revision that arrived during a refresh', () => {
  const streaming = message('latest', {
    localRevision: 3,
    message: { role: OpenAIMessageRole.ASSISTANT, content: 'new delta' },
  });
  const merged = mergeHistoryPage(
    page({ latest: streaming }),
    page({ latest: message('latest') }),
    false,
    { latest: 2 }
  );
  expect(merged.mapping.latest).toBe(streaming);
});

test('recognizes a tool message without fetching its arguments', () => {
  expect(
    hasToolCalls(
      message('tool', {
        tool_call_summaries: [{ id: 'call', name: 'web_search' }],
      })
    )
  ).toBe(true);
});

test('ignores a refresh after a newer BOS changes the active branch head', () => {
  const previous = page(
    { old: message('old'), next: message('next', { localRevision: 1 }) },
    { current_node: 'next' }
  );
  const response = page({ old: message('old') }, { current_node: 'old' });
  expect(mergeHistoryPage(previous, response, false, { old: 0 })).toBe(
    previous
  );
});

test('keeps completed SSE details when the first summary supplies its timestamp', () => {
  const streamed = message('latest', {
    updated_at: undefined,
    localRevision: 3,
    details_loaded: true,
    message: {
      role: OpenAIMessageRole.ASSISTANT,
      content: 'answer',
      reasoning_content: 'streamed reasoning',
      tool_calls: [
        {
          id: 'call',
          type: 'function',
          function: { name: 'search', arguments: '{"query":"test"}' },
        },
      ],
    },
  });
  const summary = message('latest', {
    details_loaded: false,
    has_reasoning: true,
    sibling_ids: ['latest', 'alternative'],
  });
  const merged = mergeHistoryPage(
    page({ latest: streamed }),
    page({ latest: summary }),
    false,
    { latest: 3 }
  );
  expect(merged.mapping.latest.message).toEqual(streamed.message);
  expect(merged.mapping.latest.details_loaded).toBe(true);
  expect(merged.mapping.latest.updated_at).toBe(summary.updated_at);
  expect(merged.mapping.latest.sibling_ids).toEqual(summary.sibling_ids);
  expect(merged.mapping.latest.clientKey).toBe(streamed.clientKey);
  const refreshed = mergeHistoryPage(merged, page({ latest: summary }), false, {
    latest: 3,
  });
  expect(refreshed.mapping.latest.message.reasoning_content).toBe(
    'streamed reasoning'
  );
  const changed = mergeHistoryPage(
    refreshed,
    page({ latest: { ...summary, updated_at: '2026-10-04' } }),
    false,
    { latest: 3 }
  );
  expect(changed.mapping.latest.details_loaded).toBe(false);
  expect(changed.mapping.latest.message.reasoning_content).toBeUndefined();
});

test.each([MessageStatus.STREAMING, MessageStatus.STOPPED])(
  'does not promote an incomplete or mismatched %s snapshot',
  status => {
    const streamed = message('latest', {
      updated_at: undefined,
      localRevision: 3,
      details_loaded: true,
      status,
      message: {
        role: OpenAIMessageRole.ASSISTANT,
        reasoning_content: 'partial',
      },
    });
    const merged = mergeHistoryPage(
      page({ latest: streamed }),
      page({ latest: message('latest', { details_loaded: false }) }),
      false,
      { latest: 3 }
    );
    expect(merged.mapping.latest.details_loaded).toBe(false);
    expect(merged.mapping.latest.message.reasoning_content).toBeUndefined();
  }
);

it('preserves local error metadata only for the same failed snapshot', () => {
  const failed = message('m', {
    status: MessageStatus.FAILED,
    details_loaded: true,
    attrs: {
      error_message: 'Unknown error',
      error_code: 'CONVERSATION_BUSY',
      error_status: 409,
    },
  });
  const server = message('m', {
    status: MessageStatus.FAILED,
    attrs: { error_message: 'Unknown error' },
  });
  const merged = mergeHistoryPage(page({ m: failed }), page({ m: server }));
  expect(merged.mapping.m.attrs?.error_code).toBe('CONVERSATION_BUSY');
  const recovered = mergeHistoryPage(merged, page({ m: message('m') }));
  expect(recovered.mapping.m.attrs?.error_code).toBeUndefined();
});

it('accepts a newer failed snapshot without retaining an earlier error with the same timestamp', () => {
  const original = message('m', {
    details_loaded: true,
    status: MessageStatus.FAILED,
    attrs: { error_message: 'old failure', error_code: 'CONVERSATION_BUSY' },
  });
  const changed = message('m', {
    status: MessageStatus.FAILED,
    attrs: { error_message: 'new failure', error_code: 'TOKEN_EXPIRED' },
  });
  expect(
    mergeHistoryPage(page({ m: original }), page({ m: changed })).mapping.m
      .attrs
  ).toMatchObject({
    error_message: 'new failure',
    error_code: 'TOKEN_EXPIRED',
  });
});

test('accepts final timing metadata from history while retaining loaded reasoning details', () => {
  const completeTiming = {
    version: 1 as const,
    answer_id: 'answer',
    run_id: 'run',
    status: 'complete' as const,
    started_at: '2026-11-09T00:00:00Z',
    completed_at: '2026-11-09T00:00:02Z',
    duration_ms: 2000,
  };
  const previous = page({
    answer: message('answer', {
      details_loaded: true,
      message: {
        role: OpenAIMessageRole.ASSISTANT,
        content: 'answer',
        reasoning_content: 'loaded',
      },
      attrs: { metrics: { tokens: 7 } },
    }),
  });
  const summary = page({
    answer: message('answer', {
      details_loaded: false,
      has_reasoning: true,
      attrs: { answer_timing: completeTiming },
    }),
  });
  const merged = mergeHistoryPage(previous, summary);
  expect(merged.mapping.answer.attrs).toMatchObject({
    answer_timing: completeTiming,
    metrics: { tokens: 7 },
  });
  expect(merged.mapping.answer.message.reasoning_content).toBe('loaded');
});

test.each([false, true])(
  'retains completed timing through stale history with branch replacement %s',
  replaceBranch => {
    const timing = {
      version: 1 as const,
      answer_id: 'answer',
      run_id: 'run',
      started_at: '2026-11-09T00:00:00Z',
      status: 'complete' as const,
      completed_at: '2026-11-09T00:00:05Z',
      duration_ms: 3000,
    };
    const previous = page({
      answer: message('answer', {
        details_loaded: false,
        attrs: { answer_timing: timing },
      }),
    });
    const stale = page({
      answer: message('answer', {
        updated_at: 'later',
        status: MessageStatus.STREAMING,
        attrs: {
          answer_timing: {
            version: 1,
            answer_id: timing.answer_id,
            run_id: timing.run_id,
            started_at: timing.started_at,
            status: 'running',
          },
        },
      }),
    });
    const merged = mergeHistoryPage(previous, stale, replaceBranch).mapping
      .answer;
    expect(merged.attrs?.answer_timing).toEqual(timing);
    expect(merged.status).toBe(MessageStatus.SUCCESS);
  }
);

const runningTiming: AnswerTiming = {
  version: 1,
  answer_id: 'answer',
  run_id: 'run',
  started_at: '2026-11-09T00:00:00Z',
  status: 'running',
};
const terminalTiming: AnswerTiming = {
  ...runningTiming,
  status: 'complete',
  completed_at: '2026-11-09T00:00:05Z',
  duration_ms: 5000,
};

test.each([undefined, 'answer', 'new-head'])(
  'merges timing independently of stale revisions with current node %s',
  currentNode => {
    const answer = message('answer', {
      localRevision: 2,
      attrs: { answer_timing: runningTiming, metrics: { tokens: 7 } },
    });
    const previous = page(
      { answer, 'new-head': message('new-head', { localRevision: 1 }) },
      { current_node: currentNode, branch_leaf_id: 'new-head', offset: 20 }
    );
    const incoming = page(
      {
        answer: message('answer', {
          message: { role: OpenAIMessageRole.ASSISTANT, content: 'stale' },
          attrs: { answer_timing: terminalTiming, metrics: { tokens: 1 } },
        }),
        unrelated: message('unrelated'),
      },
      { current_node: 'answer' }
    );
    const merged = mergeHistoryPage(previous, incoming, false, { answer: 1 });
    expect(merged.mapping.answer).toEqual({
      ...answer,
      attrs: { ...answer.attrs, answer_timing: terminalTiming },
    });
    if (currentNode) {
      expect(merged.current_node).toBe(currentNode);
      expect(merged.branch_leaf_id).toBe(previous.branch_leaf_id);
      expect(merged.offset).toBe(20);
      expect(merged.mapping.unrelated).toBeUndefined();
    }
  }
);

test.each([
  { answer_id: 'other-answer' },
  { run_id: 'other-run' },
  { started_at: '2026-11-09T00:00:01Z' },
  { duration_ms: -1 },
])('rejects incompatible raced timing %j', override => {
  const answer = message('answer', {
    localRevision: 2,
    attrs: { answer_timing: runningTiming },
  });
  const previous = page({ answer }, { current_node: 'answer' });
  const incoming = page({
    answer: message('answer', {
      attrs: { answer_timing: { ...terminalTiming, ...override } },
    }),
  });
  expect(mergeHistoryPage(previous, incoming, false, { answer: 1 })).toBe(
    previous
  );
});

test('does not merge raced timing from another conversation', () => {
  const previous = page(
    {
      answer: message('answer', {
        localRevision: 2,
        attrs: { answer_timing: runningTiming },
      }),
    },
    { current_node: 'answer' }
  );
  const incoming = page(
    {
      answer: message('answer', {
        attrs: { answer_timing: terminalTiming },
      }),
    },
    { id: 'other-conversation' }
  );
  expect(mergeHistoryPage(previous, incoming, false, { answer: 1 })).toBe(
    previous
  );
});
