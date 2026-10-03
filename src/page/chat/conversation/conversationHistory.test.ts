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
