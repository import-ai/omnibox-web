import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type { MessageDetail } from '@/page/chat/core/types/conversation';

export interface ConversationShareGroup {
  id: string;
  question: MessageDetail;
  answer: MessageDetail;
  messageIds: readonly [string, string];
}

export type ConversationShareInitialSelection = 'all' | 'latest';

function isDecisionMessage(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.USER &&
    (message.attrs?.tool_call?.decisions?.length ?? 0) > 0
  );
}

function isShareableQuestion(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.USER &&
    !isDecisionMessage(message) &&
    Boolean(message.message.content?.trim())
  );
}

function isFinalAnswer(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.ASSISTANT &&
    [MessageStatus.SUCCESS, MessageStatus.STOPPED].includes(message.status) &&
    !message.message.tool_calls?.length &&
    Boolean(message.message.content?.trim())
  );
}

function hasAncestor(
  message: MessageDetail,
  ancestorId: string,
  messagesById: ReadonlyMap<string, MessageDetail>
) {
  const visited = new Set<string>();
  let parentId = message.parent_id;

  while (parentId && !visited.has(parentId)) {
    if (parentId === ancestorId) return true;
    visited.add(parentId);
    parentId = messagesById.get(parentId)?.parent_id ?? '';
  }

  return false;
}

/** Builds shareable question-answer pairs from the active conversation branch. */
export function buildConversationShareGroups(
  messages: readonly MessageDetail[]
): ConversationShareGroup[] {
  const messagesById = new Map(messages.map(message => [message.id, message]));
  const selectedQuestionIds = new Set<string>();

  return messages.filter(isFinalAnswer).flatMap(answer => {
    const answerIndex = messages.indexOf(answer);
    const precedingMessages = messages.slice(0, answerIndex).reverse();
    const question =
      precedingMessages.find(
        candidate =>
          isShareableQuestion(candidate) &&
          !selectedQuestionIds.has(candidate.id) &&
          hasAncestor(answer, candidate.id, messagesById)
      ) ??
      precedingMessages.find(
        candidate =>
          isShareableQuestion(candidate) &&
          !selectedQuestionIds.has(candidate.id)
      );

    if (!question) return [];
    selectedQuestionIds.add(question.id);
    return [
      {
        id: question.id,
        question,
        answer,
        messageIds: [question.id, answer.id] as const,
      },
    ];
  });
}

export function getConversationShareGroupForMessage(
  groups: readonly ConversationShareGroup[],
  messageId: string
) {
  return groups.find(group => group.messageIds.includes(messageId));
}

export function getConversationShareAnswerIds(
  groups: readonly ConversationShareGroup[]
) {
  return groups.map(group => group.answer.id);
}

export function selectAllConversationShareGroups(
  groups: readonly ConversationShareGroup[]
) {
  return new Set(groups.map(group => group.id));
}

export function createConversationShareSelection(
  groups: readonly ConversationShareGroup[],
  targetMessageId?: string,
  initialSelection: ConversationShareInitialSelection = 'latest'
) {
  if (targetMessageId) {
    const group = getConversationShareGroupForMessage(groups, targetMessageId);
    return new Set(group ? [group.id] : []);
  }

  if (initialSelection === 'all') {
    return selectAllConversationShareGroups(groups);
  }

  const latestGroup = groups.at(-1);
  return new Set(latestGroup ? [latestGroup.id] : []);
}

export function toggleConversationShareGroup(
  selectedGroupIds: ReadonlySet<string>,
  groupId: string,
  groups: readonly ConversationShareGroup[]
) {
  const next = new Set(selectedGroupIds);
  if (next.has(groupId)) next.delete(groupId);
  else next.add(groupId);

  return new Set(groups.map(group => group.id).filter(id => next.has(id)));
}

export function areAllConversationShareGroupsSelected(
  groups: readonly ConversationShareGroup[],
  selectedGroupIds: ReadonlySet<string>
) {
  return (
    groups.length > 0 && groups.every(group => selectedGroupIds.has(group.id))
  );
}
