import {
  isTerminalMessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';

export type StreamState =
  'connected' | 'recovering' | 'offline' | 'interrupted';

// A message the server never accepted keeps its client request ID as its ID.
export function isLocalRequestMessage(message?: MessageDetail) {
  return Boolean(message && message.attrs?.client_request_id === message.id);
}

export function activeLeaf(
  conversation: ConversationDetail
): MessageDetail | undefined {
  const id = conversation.current_node;
  return id ? conversation.mapping[id] : undefined;
}

// Whether returning to the page has anything to reconcile: a reply that is
// still moving, or a request the server may not have accepted yet.
export function hasUnfinishedTurn(conversation: ConversationDetail) {
  const leaf = activeLeaf(conversation);
  if (!leaf) return false;
  return isLocalRequestMessage(leaf) || !isReplyComplete(conversation);
}

// A question with no reply is not a finished turn: the answer may still be
// arriving, or the turn may have failed before creating a message.
export function isReplyComplete(conversation: ConversationDetail) {
  const leaf = activeLeaf(conversation);
  if (!leaf) return true;
  if (leaf.message.role === OpenAIMessageRole.USER) return false;
  return isTerminalMessageStatus(leaf.status);
}

export interface SnapshotQuery {
  branch_node_id?: string;
}

// Ask for the newest branch below the node on screen. `branch_leaf_id` would
// stop at that node and hide the reply the server has already written below
// it, which is exactly what recovery needs to see.
export function snapshotQuery(conversation: ConversationDetail): SnapshotQuery {
  const leaf = activeLeaf(conversation);
  if (!leaf) return {};
  // The server does not know a local-only message, so look below its parent.
  const branchNodeId = isLocalRequestMessage(leaf)
    ? leaf.parent_id || undefined
    : leaf.id;
  return branchNodeId ? { branch_node_id: branchNodeId } : {};
}

// Where a resume should start reading the server stream. A reply already
// loaded from the server has no local event cursor, so replaying the stream
// from the beginning would append the persisted text a second time; follow
// live events instead and let the final snapshot fill in the rest.
export function resumeStreamCursor(conversation: ConversationDetail) {
  const eventId = getBranchEventId(conversation);
  if (eventId) return eventId;
  const leaf = activeLeaf(conversation);
  return leaf && leaf.message.role === OpenAIMessageRole.ASSISTANT
    ? '$'
    : undefined;
}

export function findAcceptedRequest(
  conversation: ConversationDetail,
  local: MessageDetail
): MessageDetail | undefined {
  const byRequestId = Object.values(conversation.mapping).find(
    message =>
      message.id !== local.id && message.attrs?.client_request_id === local.id
  );
  if (byRequestId) return byRequestId;
  // Older backends do not echo the client request ID. The question itself is
  // still the only user message under the same parent with the same text.
  const content = local.message.content?.trim();
  if (!content) return undefined;
  return Object.values(conversation.mapping).find(
    message =>
      message.id !== local.id &&
      message.message.role === OpenAIMessageRole.USER &&
      message.parent_id === local.parent_id &&
      message.message.content?.trim() === content
  );
}

// The server answered the request while this page showed a local-only copy:
// drop the copy and move its children to the accepted message.
export function adoptAcceptedRequest(
  conversation: ConversationDetail,
  requestId: string
): ConversationDetail {
  const local = conversation.mapping[requestId];
  if (!local || !isLocalRequestMessage(local)) return conversation;
  const accepted = findAcceptedRequest(conversation, local);
  if (!accepted) return conversation;
  const mapping = { ...conversation.mapping };
  delete mapping[requestId];
  const parent = local.parent_id ? mapping[local.parent_id] : undefined;
  if (parent) {
    const children = parent.children
      .map(id => (id === requestId ? accepted.id : id))
      .filter((id, index, all) => all.indexOf(id) === index);
    mapping[parent.id] = { ...parent, children };
  }
  // Keep the view on a live node when it pointed at the copy just removed.
  const current_node =
    conversation.current_node === requestId
      ? accepted.id
      : conversation.current_node;
  const branch_leaf_id =
    conversation.branch_leaf_id === requestId
      ? accepted.id
      : conversation.branch_leaf_id;
  return { ...conversation, mapping, current_node, branch_leaf_id };
}

// Walk the branch on screen from its leaf to the newest event cursor. Other
// branches may carry a newer cursor from a turn the user already left.
export function getBranchEventId(conversation: ConversationDetail) {
  const seen = new Set<string>();
  let currentId = conversation.current_node;
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const message = conversation.mapping[currentId];
    if (!message) return undefined;
    const eventId = message.attrs?.stream_event_id;
    if (eventId) return eventId;
    currentId = message.parent_id;
  }
  return undefined;
}

export interface InterruptionPlan {
  // Mark this message as failed.
  messageId?: string;
  // Add the failed assistant message under this user message first.
  assistantParentId?: string;
}

export function interruptionPlan(
  conversation: ConversationDetail
): InterruptionPlan | undefined {
  const leaf = activeLeaf(conversation);
  if (!leaf) return undefined;
  // A question with no reply is unfinished even when its own message is
  // already stored: the missing piece is the assistant answer.
  if (leaf.message.role === OpenAIMessageRole.USER) {
    return { assistantParentId: leaf.id };
  }
  if (isTerminalMessageStatus(leaf.status)) return undefined;
  return { messageId: leaf.id };
}
