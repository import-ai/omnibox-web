import {
  isStaleAnswerTiming,
  mergeAnswerTiming,
} from '@/page/chat/core/answerTiming';
import { createClientKey } from '@/page/chat/core/clientKey';
import {
  isTerminalMessageStatus,
  MessageStatus,
} from '@/page/chat/core/types/chatResponse';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';

// Timing advances independently of content revisions; never replay other fields.
export function mergeMessageTiming(
  existing: MessageDetail,
  incoming: MessageDetail
): MessageDetail {
  if (existing.id !== incoming.id) return existing;
  const timing = mergeAnswerTiming(
    existing.attrs?.answer_timing,
    incoming.attrs?.answer_timing
  );
  if (timing === existing.attrs?.answer_timing) return existing;
  return { ...existing, attrs: { ...existing.attrs, answer_timing: timing } };
}

export function mergeHistoryPage(
  previous: ConversationDetail,
  page: ConversationDetail,
  replaceBranch = false,
  revisions?: Record<string, number>
): ConversationDetail {
  if (previous.id !== page.id) return previous;
  if (
    revisions &&
    previous.current_node &&
    (previous.mapping[previous.current_node]?.localRevision ?? 0) !==
      (revisions[previous.current_node] ?? -1)
  ) {
    const mapping = { ...previous.mapping };
    let changed = false;
    for (const [id, snapshot] of Object.entries(page.mapping)) {
      const existing = mapping[id];
      if (!existing) continue;
      mapping[id] = mergeMessageTiming(existing, snapshot);
      changed ||= mapping[id] !== existing;
    }
    return changed ? { ...previous, mapping } : previous;
  }
  const mapping = replaceBranch ? {} : { ...previous.mapping };
  for (const [id, snapshot] of Object.entries(page.mapping)) {
    let message = snapshot;
    const existing = previous.mapping[id];
    const sameFailure =
      existing?.status === MessageStatus.FAILED &&
      message.status === MessageStatus.FAILED &&
      existing.attrs?.error_message === message.attrs?.error_message;
    if (sameFailure) {
      message = {
        ...message,
        attrs: {
          ...message.attrs,
          error_code: message.attrs?.error_code ?? existing.attrs?.error_code,
          error_status:
            message.attrs?.error_status ?? existing.attrs?.error_status,
        },
      };
    }
    if (
      !replaceBranch &&
      revisions &&
      existing &&
      (existing.localRevision ?? 0) !== (revisions[id] ?? 0)
    ) {
      mapping[id] = mergeMessageTiming(existing, message);
      continue;
    }
    mapping[id] =
      existing &&
      existing.details_loaded &&
      ((existing.status !== MessageStatus.FAILED &&
        message.status !== MessageStatus.FAILED) ||
        sameFailure) &&
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
            ...(sameFailure
              ? { attrs: { ...existing.attrs, ...message.attrs } }
              : {}),
            updated_at: message.updated_at,
            sibling_ids: message.sibling_ids,
            children: message.children,
          }
        : { ...message, clientKey: existing?.clientKey ?? createClientKey() };
    if (
      existing &&
      isTerminalMessageStatus(existing.status) &&
      isStaleAnswerTiming(
        existing.attrs?.answer_timing,
        message.attrs?.answer_timing
      )
    ) {
      mapping[id].status = existing.status;
    }
    if (existing?.attrs?.answer_timing || message.attrs?.answer_timing) {
      mapping[id].attrs = {
        ...mapping[id].attrs,
        answer_timing: mergeAnswerTiming(
          existing?.attrs?.answer_timing,
          message.attrs?.answer_timing
        ),
      };
    }
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
