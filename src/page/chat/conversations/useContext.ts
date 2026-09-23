import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { http } from '@/lib/request';
import { isConversationAccessDenied } from '@/page/chat/conversation/conversationLoadPolicy';
import type { ConversationSummary } from '@/page/chat/core/types/conversation';

interface ConversationPage {
  total: number;
  data: ConversationSummary[];
}

export default function useContext(
  namespaceIdOverride?: string,
  compact = false
) {
  const params = useParams();
  const namespaceId = namespaceIdOverride || params.namespace_id || '';
  const [loading, onLoading] = useState(false);
  const requestRef = useRef<ReturnType<typeof axios.CancelToken.source> | null>(
    null
  );
  const nextOffsetRef = useRef(0);
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
  const fetchPage = (append = false) => {
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
        ? data.data.length
        : 0
      : (current - 1) * pageSize;
    const limit =
      compact && !append ? Math.max(pageSize, data.data.length) : pageSize;
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
        onData(previous => {
          if (!append) {
            return response;
          }
          const conversations = new Map(
            previous.data.map(item => [item.id, item])
          );
          response.data.forEach(item => conversations.set(item.id, item));
          return { total: response.total, data: [...conversations.values()] };
        });
      })
      .catch((error: unknown) => {
        if (axios.isCancel(error) || requestRef.current !== source) {
          return;
        }
        setHasLoadError(true);
        if (isConversationAccessDenied(error)) {
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
  };
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
    onEdit({ id: '', title: '', open: false });
    refetch();
  };
  const onRemoveDone = () => {
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
    setAccessDenied(false);
    fetchPage();
    return () => {
      requestRef.current?.cancel();
      requestRef.current = null;
    };
  }, [namespaceId, current, pageSize]);

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
