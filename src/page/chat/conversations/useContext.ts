import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';
import { getCurrentUserId } from '@/page/chat/conversation/conversationCache';
import { isConversationAccessDenied } from '@/page/chat/conversation/conversationLoadPolicy';
import type {
  ConversationSummary,
  ConversationTitleGeneratedPayload,
} from '@/page/chat/core/types/conversation';

interface ConversationPage {
  total: number;
  data: ConversationSummary[];
}

export default function useContext(
  namespaceIdOverride?: string,
  compact = false
) {
  const params = useParams();
  const app = useApp();
  const namespaceId = namespaceIdOverride || params.namespace_id || '';
  const [loading, onLoading] = useState(false);
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
  const [data, onData] = useState<ConversationPage>({
    total: 0,
    data: [],
  });
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
    (append = false) => {
      if (append && requestRef.current) {
        return;
      }
      requestRef.current?.cancel();
      const source = axios.CancelToken.source();
      requestRef.current = source;
      onLoading(true);
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
      http
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
          onData(previous => {
            if (!append && pendingTitles.length === 0) {
              return response;
            }
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
                conversations.set(item.id, { ...existing, title: item.title });
              }
            });
            return {
              total: pendingTitles.length
                ? Math.max(response.total, previous.total)
                : response.total,
              data: [...missingTitles, ...conversations.values()],
            };
          });
        })
        .catch((error: unknown) => {
          if (axios.isCancel(error) || requestRef.current !== source) {
            return;
          }
          setHasLoadError(true);
          if (isConversationAccessDenied(error)) {
            pendingTitlesRef.current.clear();
            onData({ total: 0, data: [] });
            setAccessDenied(true);
          }
        })
        .finally(() => {
          if (requestRef.current === source) {
            requestRef.current = null;
            onLoading(false);
          }
        });
    },
    [compact, current, namespaceId, pageSize]
  );
  const refetch = () => fetchPage();
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
  const onRemoveDone = () => {
    pendingTitlesRef.current.delete(remove.id);
    onRemove({ id: '', title: '', open: false });
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
          pendingTitlesRef.current.set(conversation.id, conversation);
          onData(previous => {
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
  }, [app, compact, fetchPage, namespaceId]);

  return {
    list: {
      data,
      current,
      loading,
      accessDenied,
      hasLoadError,
      hasMore: nextOffsetRef.current < data.total,
      pageSize,
      refetch,
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
