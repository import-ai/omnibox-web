import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { http } from '@/lib/request';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';

import { getCurrentUserId } from './conversationCache';
import { mergeHistoryPage } from './conversationHistory';

export default function useConversationHistory(
  namespaceId: string,
  userId: string,
  conversation: ConversationDetail,
  setConversation: Dispatch<SetStateAction<ConversationDetail>>
) {
  const current = useRef(conversation);
  current.current = conversation;
  const scope = `${userId}:${namespaceId}:${conversation.id}`;
  const generation = useRef({ scope, branch: 0 });
  if (generation.current.scope !== scope)
    generation.current = { scope, branch: 0 };
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const pageRequest = useRef<Promise<void> | null>(null);
  const details = useRef(new Map<string, Promise<void>>());
  const detailCache = useRef(new Map<string, MessageDetail>());
  const baseUrl = `/namespaces/${namespaceId}/conversations/${conversation.id}/messages`;
  useEffect(() => {
    details.current.clear();
    detailCache.current.clear();
    pageRequest.current = null;
    setLoadingHistory(false);
    setHistoryError(false);
  }, [scope]);

  useEffect(() => {
    generation.current = { scope, branch: 0 };
    return () => {
      generation.current = { scope: '', branch: -1 };
    };
  }, [scope]);

  const valid = useCallback(
    (token: typeof generation.current) =>
      token === generation.current && getCurrentUserId() === userId,
    [userId]
  );

  const loadPage = useCallback(
    (branchNodeId?: string): Promise<void> => {
      if (!branchNodeId && pageRequest.current) return pageRequest.current;
      if (branchNodeId) {
        generation.current = { scope, branch: generation.current.branch + 1 };
        details.current.clear();
        detailCache.current.clear();
      }
      const token = generation.current;
      const before = current.current;
      if (!branchNodeId && !before.has_more) return Promise.resolve();
      setLoadingHistory(true);
      setHistoryError(false);
      const params = branchNodeId
        ? { branch_node_id: branchNodeId }
        : {
            branch_leaf_id: before.branch_leaf_id,
            offset: (before.offset ?? 0) + (before.limit ?? 10),
          };
      const request = http
        .get<ConversationDetail>(baseUrl, { params })
        .then((page: ConversationDetail) => {
          if (!valid(token)) return;
          setConversation(prev => {
            if (prev.id !== before.id) return prev;
            const merged = mergeHistoryPage(prev, page, Boolean(branchNodeId));
            if (!branchNodeId) merged.current_node = prev.current_node;
            return merged;
          });
        })
        .catch(() => {
          if (valid(token)) setHistoryError(true);
        })
        .finally(() => {
          if (pageRequest.current === request) pageRequest.current = null;
          if (valid(token)) setLoadingHistory(false);
        });
      pageRequest.current = request;
      return request;
    },
    [baseUrl, scope, setConversation, valid]
  );

  const loadDetails = useCallback(
    async (ids: string[]) => {
      const token = generation.current;
      const unique = [...new Set(ids)];
      const waits = unique.flatMap(id =>
        details.current.get(id) ? [details.current.get(id)!] : []
      );
      const missing = unique.filter(
        id =>
          !details.current.has(id) &&
          !current.current.mapping[id]?.details_loaded &&
          !(detailCache.current.has(id) && !current.current.mapping[id])
      );
      for (let start = 0; start < missing.length; start += 50) {
        const batch = missing.slice(start, start + 50);
        const revisions = new Map(
          batch.map(id => [id, current.current.mapping[id]?.localRevision ?? 0])
        );
        const request = http
          .get<{ mapping: Record<string, MessageDetail> }>(
            `${baseUrl}/details`,
            { params: { ids: batch.join(',') } }
          )
          .then((response: { mapping: Record<string, MessageDetail> }) => {
            if (!valid(token)) return;
            for (const [id, message] of Object.entries(response.mapping)) {
              if (
                (current.current.mapping[id]?.localRevision ?? 0) ===
                revisions.get(id)
              )
                detailCache.current.set(id, message);
            }
            setConversation(prev => {
              const mapping = { ...prev.mapping };
              for (const [id, message] of Object.entries(response.mapping)) {
                const existing = mapping[id];
                if (
                  !existing ||
                  (existing.localRevision ?? 0) !== revisions.get(id)
                )
                  continue;
                mapping[id] = { ...existing, ...message, details_loaded: true };
              }
              return { ...prev, mapping };
            });
          })
          .finally(() => {
            for (const id of batch)
              if (details.current.get(id) === request)
                details.current.delete(id);
          });
        for (const id of batch) details.current.set(id, request);
        waits.push(request);
      }
      await Promise.all(waits);
      return Object.fromEntries(
        unique.map(id => [
          id,
          current.current.mapping[id]?.details_loaded
            ? current.current.mapping[id]
            : detailCache.current.get(id),
        ])
      );
    },
    [baseUrl, setConversation, valid]
  );

  useEffect(() => {
    const target = window.location.hash.startsWith('#message-')
      ? window.location.hash.slice(9)
      : '';
    if (
      target &&
      !current.current.mapping[target] &&
      conversation.has_more &&
      !loadingHistory &&
      !historyError
    )
      void loadPage();
  }, [conversation, historyError, loadPage, loadingHistory]);

  useEffect(() => {
    const onHash = () => {
      if (
        window.location.hash.startsWith('#message-') &&
        !current.current.mapping[window.location.hash.slice(9)]
      )
        void loadPage();
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadPage]);

  const refresh = async () => {
    const token = generation.current;
    const before = current.current;
    const revisions = Object.fromEntries(
      Object.entries(before.mapping).map(([id, message]) => [
        id,
        message.localRevision ?? 0,
      ])
    );
    const page: ConversationDetail = await http.get(baseUrl, {
      params: { branch_leaf_id: before.current_node },
    });
    if (!valid(token)) return;
    setConversation(prev => mergeHistoryPage(prev, page, false, revisions));
  };

  return {
    refreshHistory: refresh,
    loadMore: () => loadPage(),
    activateBranch: (id: string) => loadPage(id),
    loadDetails,
    loadingHistory,
    historyError,
  };
}
