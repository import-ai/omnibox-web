import copy from 'copy-to-clipboard';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';
import {
  type ConversationShareChannel,
  type ConversationShareSnapshot,
  createConversationShare,
} from '@/service/conversationShare';

import {
  areAllConversationShareGroupsSelected,
  buildConversationShareGroups,
  type ConversationShareInitialSelection,
  createConversationShareSelection,
  getConversationShareAnswerIds,
  getConversationShareGroupForMessage,
  selectAllConversationShareGroups,
  toggleConversationShareGroup,
} from './conversationShareGroups';

async function copyShareLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return copy(url);
  }
}

async function deliverSnapshot(
  snapshot: ConversationShareSnapshot,
  channel: ConversationShareChannel,
  t: TFunction
) {
  if (channel === 'copy_link') {
    if (!(await copyShareLink(snapshot.url))) throw new Error('copy_failed');
    return 'copied' as const;
  }

  if (navigator.share) {
    await navigator.share({
      title: snapshot.title || t('chat.share.wechatCardTitle'),
      text: snapshot.summary,
      url: snapshot.url,
    });
    return 'shared' as const;
  }

  if (!(await copyShareLink(snapshot.url))) throw new Error('copy_failed');
  return 'copied' as const;
}

export function useConversationShare({
  conversation,
  isGenerating,
  messages,
  namespaceId,
}: {
  conversation: ConversationDetail;
  isGenerating: boolean;
  messages: readonly MessageDetail[];
  namespaceId: string;
}) {
  const { t } = useTranslation();
  const groups = useMemo(
    () => buildConversationShareGroups(messages),
    [messages]
  );
  const [allBranch, setAllBranch] = useState<{ leaf: string; total: number }>();
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  useEffect(() => {
    setIsSelecting(false);
    setAllBranch(undefined);
    setExcluded(new Set());
    setSelectedGroupIds(new Set());
  }, [conversation.id, conversation.branch_leaf_id]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [sharingChannel, setSharingChannel] =
    useState<ConversationShareChannel | null>(null);
  const isSharing = sharingChannel !== null;
  const [selectedGroupIds, setSelectedGroupIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const close = useCallback(() => {
    if (isSharing) return;
    setIsSelecting(false);
    setAllBranch(undefined);
    setExcluded(new Set());
    setSelectedGroupIds(new Set());
  }, [isSharing]);

  const open = useCallback(
    (
      targetMessageId?: string,
      initialSelection: ConversationShareInitialSelection = 'latest'
    ) => {
      if (isGenerating) {
        toast.error(t('chat.share.generating'));
        return;
      }
      if (groups.length === 0) {
        toast.error(t('chat.share.noCompletedGroup'));
        return;
      }
      if (
        targetMessageId &&
        !getConversationShareGroupForMessage(groups, targetMessageId)
      ) {
        toast.error(t('chat.share.noCompletedGroup'));
        return;
      }

      setAllBranch(
        initialSelection === 'all' &&
          !targetMessageId &&
          conversation.branch_leaf_id
          ? {
              leaf: conversation.branch_leaf_id,
              total: conversation.shareable_total ?? groups.length,
            }
          : undefined
      );
      setExcluded(new Set());
      setSelectedGroupIds(
        createConversationShareSelection(
          groups,
          targetMessageId,
          initialSelection
        )
      );
      setIsSelecting(true);
    },
    [
      groups,
      isGenerating,
      t,
      conversation.branch_leaf_id,
      conversation.shareable_total,
    ]
  );

  const toggleGroup = useCallback(
    (groupId: string) => {
      if (allBranch) {
        const answerId = groups.find(group => group.id === groupId)?.answer.id;
        if (answerId)
          setExcluded(previous => {
            const next = new Set(previous);
            if (next.has(answerId)) next.delete(answerId);
            else next.add(answerId);
            return next;
          });
        return;
      }
      setSelectedGroupIds(current =>
        toggleConversationShareGroup(current, groupId, groups)
      );
    },
    [groups, allBranch]
  );

  const toggleAll = useCallback(() => {
    if (conversation.branch_leaf_id) {
      if (allBranch && excluded.size === 0) {
        setAllBranch(undefined);
        setSelectedGroupIds(new Set());
      } else
        setAllBranch({
          leaf: conversation.branch_leaf_id,
          total: conversation.shareable_total ?? groups.length,
        });
      setExcluded(new Set());
      return;
    }
    setSelectedGroupIds(current =>
      areAllConversationShareGroupsSelected(groups, current)
        ? new Set()
        : selectAllConversationShareGroups(groups)
    );
  }, [
    groups,
    allBranch,
    excluded.size,
    conversation.branch_leaf_id,
    conversation.shareable_total,
  ]);

  const effectiveSelection = allBranch
    ? new Set(
        groups
          .filter(group => !excluded.has(group.answer.id))
          .map(group => group.id)
      )
    : selectedGroupIds;
  const selectionCount = allBranch
    ? allBranch.total - excluded.size
    : selectedGroupIds.size;
  const selectedGroups = useMemo(
    () => groups.filter(group => selectedGroupIds.has(group.id)),
    [groups, selectedGroupIds]
  );

  const share = useCallback(
    async (channel: ConversationShareChannel) => {
      if (!conversation.id || selectionCount === 0 || isSharing) return;

      setSharingChannel(channel);
      try {
        const snapshot = await createConversationShare(namespaceId, {
          channel,
          conversation_id: conversation.id,
          ...(allBranch
            ? {
                select_all: true as const,
                branch_leaf_id: allBranch.leaf,
                excluded_answer_ids: [...excluded],
              }
            : { answer_ids: getConversationShareAnswerIds(selectedGroups) }),
        });
        const result = await deliverSnapshot(snapshot, channel, t);
        toast.success(
          t(
            result === 'shared'
              ? 'chat.share.shareSuccess'
              : channel === 'copy_link'
                ? 'chat.share.copySuccess'
                : 'chat.share.copiedForWechat'
          )
        );
        setIsSelecting(false);
        setSelectedGroupIds(new Set());
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        toast.error(
          t(
            error instanceof Error && error.message === 'copy_failed'
              ? 'chat.share.copyFailed'
              : 'chat.share.createFailed'
          )
        );
      } finally {
        setSharingChannel(null);
      }
    },
    [
      conversation.id,
      isSharing,
      namespaceId,
      selectedGroups,
      t,
      allBranch,
      excluded,
      selectionCount,
    ]
  );

  const messageGroupIds = useMemo(() => {
    const result = new Map<string, string>();
    groups.forEach(group => {
      group.messageIds.forEach(messageId => result.set(messageId, group.id));
    });
    return result;
  }, [groups]);

  return {
    allSelected: allBranch
      ? excluded.size === 0
      : !conversation.has_more &&
        areAllConversationShareGroupsSelected(groups, selectedGroupIds),
    close,
    hasSelection: selectionCount > 0,
    isSelecting,
    isSharing,
    messageGroupIds,
    open,
    selectedCount: selectionCount,
    selectedGroupIds: effectiveSelection,
    share,
    sharingChannel,
    toggleAll,
    toggleGroup,
  };
}
