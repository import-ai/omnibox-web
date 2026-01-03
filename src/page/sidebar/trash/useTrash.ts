import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';

import { TrashItem, TrashListResponse } from './types';

const DEFAULT_LIMIT = 20;

export function useTrash() {
  const { namespace_id } = useParams();
  const { t } = useTranslation();
  const app = useApp();

  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [hasMore, setHasMore] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTrash = useCallback(
    async (search?: string, offset: number = 0, append: boolean = false) => {
      if (!namespace_id) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('limit', DEFAULT_LIMIT.toString());
        params.append('offset', offset.toString());
        if (search) {
          params.append('search', search);
        }

        const response = await http.get<TrashListResponse>(
          `/namespaces/${namespace_id}/resources/trash?${params.toString()}`
        );

        if (append) {
          setItems(prev => [...prev, ...response.items]);
        } else {
          setItems(response.items);
        }
        setTotal(response.total);
        setHasMore(offset + response.items.length < response.total);
      } catch {
        // Error is automatically toasted by http client
      } finally {
        setLoading(false);
      }
    },
    [namespace_id]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
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
    fetchTrash(searchValue, items.length, true);
  }, [loading, hasMore, fetchTrash, searchValue, items.length]);

  const restoreItem = useCallback(
    async (id: string) => {
      if (!namespace_id) return;

      try {
        const response = await http.post(
          `/namespaces/${namespace_id}/resources/${id}/restore`
        );
        toast.success(t('trash.restore_success'));

        // Remove from trash list
        setItems(prev => prev.filter(item => item.id !== id));
        setTotal(prev => prev - 1);

        // Fire event to update sidebar
        app.fire('restore_resource', response);
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

        // Remove from trash list
        setItems(prev => prev.filter(item => item.id !== id));
        setTotal(prev => prev - 1);
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

      // Clear the list
      setItems([]);
      setTotal(0);
      setHasMore(false);
    } catch {
      // Error is automatically toasted
    }
  }, [namespace_id, t]);

  const refresh = useCallback(() => {
    fetchTrash(searchValue, 0, false);
  }, [fetchTrash, searchValue]);

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
  };
}
