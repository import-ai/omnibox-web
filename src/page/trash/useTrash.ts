import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';
import { useSidebarStore } from '@/page/sidebar/store';

import { TrashItem, TrashListResponse } from './types';

const DEFAULT_LIMIT = 20;

export function useTrash() {
  const { namespace_id } = useParams();
  const { t } = useTranslation();
  const app = useApp();

  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  // Unfiltered trash size for the sidebar icon. Search responses must not
  // change it, or a query with no matches makes the icon look empty.
  const [total, setTotal] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [trashRetentionDays, setTrashRetentionDays] = useState<number | null>(
    null
  );

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchValueRef = useRef('');
  const listRequestIdRef = useRef(0);
  const countRequestIdRef = useRef(0);

  searchValueRef.current = searchValue;

  const queryTrash = useCallback(
    (search: string, offset: number) => {
      const params = new URLSearchParams();
      params.append('limit', DEFAULT_LIMIT.toString());
      params.append('offset', offset.toString());
      if (search) {
        params.append('search', search);
      }

      return http.get<TrashListResponse>(
        `/namespaces/${namespace_id}/resources/trash?${params.toString()}`
      );
    },
    [namespace_id]
  );

  const fetchTrash = useCallback(
    async (search?: string, offset: number = 0, append: boolean = false) => {
      if (!namespace_id) return;

      const keyword = search ?? '';
      const listRequestId = ++listRequestIdRef.current;
      // Only an unfiltered list owns the icon count. A filtered response keeps
      // its own list generation so a slower full-list response cannot replace
      // search results, while that full-list response can still update the icon.
      const countRequestId = keyword ? null : ++countRequestIdRef.current;

      setLoading(true);
      try {
        const response = await queryTrash(keyword, offset);
        const isLatestList = listRequestId === listRequestIdRef.current;
        if (isLatestList) {
          if (append) {
            setItems(prev => [...prev, ...response.items]);
          } else {
            setItems(response.items);
          }
          setHasMore(offset + response.items.length < response.total);
          setTrashRetentionDays(response.trash_retention_days ?? null);
          setLoading(false);
        }
        if (
          countRequestId !== null &&
          countRequestId === countRequestIdRef.current
        ) {
          setTotal(response.total);
          if (!isLatestList) {
            setTrashRetentionDays(response.trash_retention_days ?? null);
          }
        }
      } catch {
        if (listRequestId === listRequestIdRef.current) {
          setLoading(false);
        }
        // Error is automatically toasted by http client
      }
    },
    [namespace_id, queryTrash]
  );

  const refreshTrashCount = useCallback(async () => {
    if (!namespace_id) return;

    const countRequestId = ++countRequestIdRef.current;
    try {
      const response = await queryTrash('', 0);
      if (countRequestId !== countRequestIdRef.current) return;
      setTotal(response.total);
      setTrashRetentionDays(response.trash_retention_days ?? null);
    } catch {
      // Error is automatically toasted by http client
    }
  }, [namespace_id, queryTrash]);

  const handleSearchChange = useCallback(
    (value: string) => {
      searchValueRef.current = value;
      setSearchValue(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        fetchTrash(value, 0, false);
      }, 300);
    },
    [fetchTrash]
  );

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    fetchTrash(searchValueRef.current, items.length, true);
  }, [loading, hasMore, fetchTrash, items.length]);

  const ignoreInFlightTrashCount = () => {
    countRequestIdRef.current += 1;
  };

  const restoreItem = useCallback(
    async (id: string, onSuccess?: () => void) => {
      if (!namespace_id) return;

      try {
        const response = await http.post(
          `/namespaces/${namespace_id}/resources/${id}/restore`
        );
        toast.success(t('trash.restore_success'));

        ignoreInFlightTrashCount();
        setItems(prev => prev.filter(item => item.id !== id));
        setTotal(prev => Math.max(0, prev - 1));

        // Fire event to update sidebar
        app.fire('restore_resource', response);
        if (response?.resource_type === 'smart_folder') {
          useSidebarStore.getState().refetchSmartFolderEntitlements();
        }
        if (response?.resource_type === 'rss_folder') {
          useSidebarStore.getState().refetchRssFolderLimits();
        }

        onSuccess?.();
      } catch {
        // Error is automatically toasted
      }
    },
    [namespace_id, t, app]
  );

  const permanentlyDelete = useCallback(
    async (id: string) => {
      if (!namespace_id) return;

      try {
        await http.delete(`/namespaces/${namespace_id}/resources/trash/${id}`);
        toast.success(t('trash.delete_success'));

        ignoreInFlightTrashCount();
        setItems(prev => prev.filter(item => item.id !== id));
        setTotal(prev => Math.max(0, prev - 1));
      } catch {
        // Error is automatically toasted
      }
    },
    [namespace_id, t]
  );

  const emptyTrash = useCallback(async () => {
    if (!namespace_id) return;

    try {
      await http.delete(`/namespaces/${namespace_id}/resources/trash`);
      toast.success(t('trash.clear_success'));

      ignoreInFlightTrashCount();
      setItems([]);
      setTotal(0);
      setHasMore(false);
    } catch {
      // Error is automatically toasted
    }
  }, [namespace_id, t]);

  const refresh = useCallback(() => {
    fetchTrash(searchValueRef.current, 0, false);
  }, [fetchTrash]);

  useEffect(() => {
    return app.on('trash_updated', () => {
      const keyword = searchValueRef.current;
      void fetchTrash(keyword, 0, false);
      if (keyword) {
        void refreshTrashCount();
      }
    });
  }, [app, fetchTrash, refreshTrashCount]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    items,
    loading,
    total,
    searchValue,
    hasMore,
    setSearchValue: handleSearchChange,
    loadMore,
    restoreItem,
    permanentlyDelete,
    emptyTrash,
    refresh,
    fetchTrash,
    trashRetentionDays,
  };
}
