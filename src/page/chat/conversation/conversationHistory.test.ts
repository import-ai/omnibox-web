import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type {
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
