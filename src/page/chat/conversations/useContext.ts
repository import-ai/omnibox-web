import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';
import { getCurrentUserId } from '@/page/chat/conversation/conversationCache';
import { isConversationAccessDenied } from '@/page/chat/conversation/conversationLoadPolicy';
import {
  applyProvisionalConversations,
  clearProvisionalConversation,
  type ProvisionalConversation,
  readProvisionalConversations,
  rememberProvisionalConversation,
} from '@/page/chat/conversations/provisionalConversation';
import type {
  ConversationSummary,
  ConversationTitleGeneratedPayload,
} from '@/page/chat/core/types/conversation';

import {
  forgetConversationFromOrder,
  rememberConversationOrder,
} from './conversationNavigation';

interface ConversationPage {
  total: number;
  data: ConversationSummary[];
}

interface ProvisionalConversationPayload {
  userId: string;
  namespaceId: string;
  conversation?: ProvisionalConversation;
  clearId?: string;
}

interface ConversationDeletedPayload {
  namespaceId: string;
  conversationId: string;
}

export default function useContext(
  namespaceIdOverride?: string,
  compact = false
) {
  const params = useParams();
  const app = useApp();
  const namespaceId = namespaceIdOverride || params.namespace_id || '';
  const [loading, onLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastAppendRef = useRef(false);
  const requestRef = useRef<ReturnType<typeof axios.CancelToken.source> | null>(
    null
  );
  const nextOffsetRef = useRef(0);
  const loadedCountRef = useRef(0);
  // Keep acknowledged titles visible until the list API confirms them.
  const pendingTitlesRef = useRef(new Map<string, ConversationSummary>());
  const [hasLoadError, setHasLoadError] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [current, onCurrent] = useState(1);
  const [pageSize] = useState(10);
  const serverPageRef = useRef<ConversationPage>({ total: 0, data: [] });
  const withProvisional = useCallback(
    (page: ConversationPage) => {
      if (!compact) {
        return page;
      }
      const scope = { userId: getCurrentUserId(), namespaceId };
      const applied = applyProvisionalConversations(
        page,
        readProvisionalConversations(scope)
      );
      applied.confirmedIds.forEach(id =>
        clearProvisionalConversation(scope, id)
      );
      return { total: applied.total, data: applied.data };
    },
    [compact, namespaceId]
  );
  const [data, onData] = useState<ConversationPage>(() =>
    withProvisional({ total: 0, data: [] })
  );
  const setConversationData = useCallback(
    (
      next:
        ConversationPage | ((previous: ConversationPage) => ConversationPage)
    ) => {
      onData(previous => {
        const value = typeof next === 'function' ? next(previous) : next;
        if (compact) {
          rememberConversationOrder(
            namespaceId,
            value.data,
            nextOffsetRef.current >= value.total
          );
        }
        return value;
      });
    },
    [compact, namespaceId]
  );
  const removeConversation = useCallback(
    (conversationId: string) => {
      if (!conversationId) return;
      pendingTitlesRef.current.delete(conversationId);
      clearProvisionalConversation(
        { userId: getCurrentUserId(), namespaceId },
        conversationId
      );
      forgetConversationFromOrder(namespaceId, conversationId);
      const withoutConversation = (page: ConversationPage) => {
        if (!page.data.some(item => item.id === conversationId)) return page;
        return {
          total: Math.max(0, page.total - 1),
          data: page.data.filter(item => item.id !== conversationId),
        };
      };
      serverPageRef.current = withoutConversation(serverPageRef.current);
      setConversationData(withoutConversation);
    },
    [namespaceId, setConversationData]
  );
  const [edit, onEdit] = useState<{
    id: string;
    title: string;
    open: boolean;
  }>({
    id: '',
    title: '',
    open: false,
  });
  const [remove, onRemove] = useState<{
    id: string;
    title: string;
    open: boolean;
  }>({
    id: '',
    title: '',
    open: false,
  });
  loadedCountRef.current = data.data.length;
  const fetchPage = useCallback(
    (append = false): Promise<void> => {
      if (append && requestRef.current) {
        return Promise.resolve();
      }
      requestRef.current?.cancel();
      const source = axios.CancelToken.source();
      requestRef.current = source;
      lastAppendRef.current = append;
      onLoading(true);
      setLoadingMore(append);
      setHasLoadError(false);
      const offset = compact
        ? append
          ? nextOffsetRef.current
          : 0
        : (current - 1) * pageSize;
      const limit =
        compact && !append
          ? Math.max(pageSize, loadedCountRef.current)
          : pageSize;
      return http
        .get(`/namespaces/${namespaceId}/me`, { cancelToken: source.token })
        .then(() => {
          source.token.throwIfRequested();
          return http.get(
            `/namespaces/${namespaceId}/conversations?offset=${offset}&limit=${limit}&order=desc`,
            { cancelToken: source.token }
          );
        })
        .then((response: ConversationPage) => {
          if (requestRef.current !== source) {
            return;
          }
          nextOffsetRef.current = response.data.length
            ? offset + response.data.length
            : response.total;
          setAccessDenied(false);
          response.data.forEach(item => {
            if (pendingTitlesRef.current.get(item.id)?.title === item.title) {
              pendingTitlesRef.current.delete(item.id);
            }
          });
          const pendingTitles = [...pendingTitlesRef.current.values()];
          setConversationData(previous => {
            let base: ConversationPage;
            if (!append && pendingTitles.length === 0) {
              base = response;
            } else {
              const conversations = new Map(
                (append ? previous.data : []).map(item => [item.id, item])
              );
              response.data.forEach(item => conversations.set(item.id, item));
              const missingTitles = pendingTitles.filter(
                item => !conversations.has(item.id)
              );
              pendingTitles.forEach(item => {
                const existing = conversations.get(item.id);
                if (existing) {
                  conversations.set(item.id, {
                    ...existing,
                    title: item.title,
                  });
                }
              });
              base = {
                total: pendingTitles.length
                  ? Math.max(response.total, previous.total)
                  : response.total,
                data: [...missingTitles, ...conversations.values()],
              };
            }
            serverPageRef.current = base;
            return withProvisional(base);
          });
        })
        .catch((error: unknown) => {
          if (axios.isCancel(error) || requestRef.current !== source) {
            return;
          }
          setHasLoadError(true);
          if (isConversationAccessDenied(error)) {
            pendingTitlesRef.current.clear();
            serverPageRef.current = { total: 0, data: [] };
            setConversationData({ total: 0, data: [] });
            setAccessDenied(true);
          }
        })
        .finally(() => {
          if (requestRef.current === source) {
            requestRef.current = null;
            onLoading(false);
            setLoadingMore(false);
          }
        })
        .then(() => undefined);
    },
    [
      compact,
      current,
      namespaceId,
      pageSize,
      setConversationData,
      withProvisional,
    ]
  );
  const refetch = useCallback(() => fetchPage(), [fetchPage]);
  const retry = useCallback(
    () => fetchPage(lastAppendRef.current),
    [fetchPage]
  );
  const onPagerChange = (page: number) => {
    if (compact) {
      if (nextOffsetRef.current < data.total) {
        fetchPage(true);
      }
      return;
    }
    onCurrent(page);
  };
  const onEditDone = () => {
    pendingTitlesRef.current.delete(edit.id);
    onEdit({ id: '', title: '', open: false });
    refetch();
  };
  const onRemoveDone = (conversationId = remove.id) => {
    removeConversation(conversationId);
    onRemove(previous =>
      previous.id === conversationId
        ? { id: '', title: '', open: false }
        : previous
    );
    refetch();
  };
  const onEditChange = (open: boolean) => {
    onEdit({ ...edit, open });
  };
  const onRemoveChange = (open: boolean) => {
    onRemove({ ...remove, open });
  };

  useEffect(() => {
    pendingTitlesRef.current.clear();
    setAccessDenied(false);
    fetchPage();
    return () => {
      requestRef.current?.cancel();
      requestRef.current = null;
    };
  }, [fetchPage]);

  useEffect(() => {
    return app.on(
      'chat:conversation:title-generated',
      (payload: ConversationTitleGeneratedPayload) => {
        if (
          payload.namespaceId !== namespaceId ||
          payload.userId !== getCurrentUserId()
        ) {
          return;
        }
        if (compact && payload.conversation.created_at) {
          const conversation = payload.conversation;
          clearProvisionalConversation(
            { userId: payload.userId, namespaceId },
            conversation.id
          );
          pendingTitlesRef.current.set(conversation.id, conversation);
          setConversationData(previous => {
            const exists = previous.data.some(
              item => item.id === conversation.id
            );
            return {
              total: previous.total + (exists ? 0 : 1),
              data: exists
                ? previous.data.map(item =>
                    item.id === conversation.id
                      ? { ...item, title: conversation.title }
                      : item
                  )
                : [conversation, ...previous.data],
            };
          });
        }
        fetchPage();
      }
    );
  }, [app, compact, fetchPage, namespaceId, setConversationData]);

  useEffect(() => {
    return app.on(
      'chat:conversation:provisional',
      (payload: ProvisionalConversationPayload) => {
        if (
          !compact ||
          payload.namespaceId !== namespaceId ||
          payload.userId !== getCurrentUserId()
        ) {
          return;
        }
        const scope = { userId: payload.userId, namespaceId };
        if (payload.clearId) {
          clearProvisionalConversation(scope, payload.clearId);
        } else if (payload.conversation) {
          rememberProvisionalConversation(scope, payload.conversation);
        }
        setConversationData(withProvisional(serverPageRef.current));
      }
    );
  }, [app, compact, namespaceId, setConversationData, withProvisional]);

  useEffect(() => {
    return app.on(
      'chat:conversation:deleted',
      (payload: ConversationDeletedPayload) => {
        if (payload.namespaceId !== namespaceId) {
          return;
        }
        removeConversation(payload.conversationId);
        fetchPage();
      }
    );
  }, [app, fetchPage, namespaceId, removeConversation]);

  return {
    list: {
      data,
      current,
      loading,
      loadingMore,
      accessDenied,
      hasLoadError,
      hasMore: nextOffsetRef.current < data.total,
      pageSize,
      refetch,
      retry,
      onPagerChange,
    },
    edit,
    onEdit,
    remove,
    onRemove,
    onEditDone,
    onEditChange,
    onRemoveDone,
    namespaceId,
    onRemoveChange,
  };
}
