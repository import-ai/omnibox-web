import { createClientKey } from '@/page/chat/core/clientKey';
import { isTerminalMessageStatus } from '@/page/chat/core/types/chatResponse';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';

export function mergeHistoryPage(
  previous: ConversationDetail,
  page: ConversationDetail,
  replaceBranch = false,
  revisions?: Record<string, number>
): ConversationDetail {
  if (
    revisions &&
    previous.current_node &&
    (previous.mapping[previous.current_node]?.localRevision ?? 0) !==
      (revisions[previous.current_node] ?? -1)
  )
    return previous;
  const mapping = replaceBranch ? {} : { ...previous.mapping };
  for (const [id, message] of Object.entries(page.mapping)) {
    const existing = previous.mapping[id];
    if (
      !replaceBranch &&
      revisions &&
      existing &&
      (existing.localRevision ?? 0) !== (revisions[id] ?? 0)
    ) {
      mapping[id] = existing;
      continue;
    }
    mapping[id] =
      existing &&
      existing.details_loaded &&
      (existing.updated_at === message.updated_at ||
        // Completed SSE snapshots get their first server timestamp on refresh.
        (revisions &&
          existing.localRevision &&
          !existing.updated_at &&
          isTerminalMessageStatus(existing.status) &&
          existing.status === message.status))
        ? {
            ...message,
            ...existing,
            updated_at: message.updated_at,
            sibling_ids: message.sibling_ids,
            children: message.children,
          }
        : { ...message, clientKey: existing?.clientKey ?? createClientKey() };
  }
  const citations = new Map(
    (replaceBranch ? [] : (previous.citations ?? [])).map(citation => [
      citation.index,
      citation,
    ])
  );
  for (const citation of page.citations ?? [])
    citations.set(citation.index, citation);
  const keepOlder =
    !replaceBranch && (previous.offset ?? 0) > (page.offset ?? 0);
  const offset = keepOlder
    ? (previous.offset ?? 0) +
      Math.max(0, (page.total ?? 0) - (previous.total ?? 0))
    : page.offset;
  return {
    ...previous,
    ...page,
    mapping,
    offset,
    has_more: keepOlder ? previous.has_more : page.has_more,
    citations: [...citations.values()].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0)
    ),
  };
}

export function hasToolCalls(message: MessageDetail) {
  return Boolean(
    message.message.tool_calls?.length || message.tool_call_summaries?.length
  );
}
