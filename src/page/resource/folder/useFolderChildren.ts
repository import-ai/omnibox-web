import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ResourceSummary } from '@/interface';
import { http } from '@/lib/request';

const PAGE_SIZE = 10;

interface UseFolderChildrenOptions {
  resourceId: string;
  apiPrefix: string;
  loadAll?: boolean;
  smartFolderParentId?: string;
  sortQuery: string;
}

export function mergeUniqueResources(
  current: ResourceSummary[],
  incoming: ResourceSummary[]
) {
  const seen = new Set(current.map(item => item.id));
  const merged = [...current];
  incoming.forEach(item => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    merged.push(item);
  });
  return merged;
}

export function uniqueResources(resources: ResourceSummary[]) {
  return mergeUniqueResources([], resources);
}

export default function useFolderChildren({
  resourceId,
  apiPrefix,
  loadAll,
  smartFolderParentId,
  sortQuery,
}: UseFolderChildrenOptions) {
  const [data, setData] = useState<ResourceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const requestVersionRef = useRef(0);
  const activeSourceRef = useRef<ReturnType<
    typeof axios.CancelToken.source
  > | null>(null);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const offsetRef = useRef(0);
  const isSmartFolder = !!smartFolderParentId;

  const beginRequest = useCallback(() => {
    const version = requestVersionRef.current + 1;
    requestVersionRef.current = version;
    activeSourceRef.current?.cancel();
    const source = axios.CancelToken.source();
    activeSourceRef.current = source;
    return { source, version };
  }, []);

  const finishRequest = useCallback(
    (version: number, source: ReturnType<typeof axios.CancelToken.source>) => {
      if (version !== requestVersionRef.current) return false;
      if (activeSourceRef.current === source) activeSourceRef.current = null;
      return true;
    },
    []
  );

  const invalidateRequests = useCallback(() => {
    requestVersionRef.current += 1;
    activeSourceRef.current?.cancel();
    activeSourceRef.current = null;
    loadingRef.current = false;
    loadingMoreRef.current = false;
  }, []);

  const reload = useCallback(() => {
    const { source, version } = beginRequest();
    loadingRef.current = true;
    loadingMoreRef.current = false;
    hasMoreRef.current = true;
    offsetRef.current = 0;
    setLoading(true);
    setLoadingMore(false);
    setData([]);
    setHasMore(true);

    const requestUrl = loadAll
      ? `${apiPrefix}/${resourceId}/children?summary=true${sortQuery}`
      : `${apiPrefix}/${resourceId}/children?summary=true&offset=0&limit=${PAGE_SIZE}${sortQuery}`;

    http
      .get(requestUrl, {
        cancelToken: source.token,
        mute: isSmartFolder,
      })
      .then((res: ResourceSummary[]) => {
        if (version !== requestVersionRef.current) return;
        setData(uniqueResources(res));
        offsetRef.current = 0;
        const nextHasMore = !loadAll && res.length === PAGE_SIZE;
        hasMoreRef.current = nextHasMore;
        setHasMore(nextHasMore);
      })
      .catch(error => {
        if (version !== requestVersionRef.current) return;
        if (isSmartFolder && error.response?.status === 404) {
          setData([]);
          offsetRef.current = 0;
          hasMoreRef.current = false;
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!finishRequest(version, source)) return;
        loadingRef.current = false;
        setLoading(false);
      });
  }, [
    apiPrefix,
    beginRequest,
    finishRequest,
    isSmartFolder,
    loadAll,
    resourceId,
    sortQuery,
  ]);

  const reloadSmartFolder = useCallback(() => {
    if (!smartFolderParentId) return;

    const { source, version } = beginRequest();
    loadingRef.current = true;
    loadingMoreRef.current = false;
    http
      .get(`${apiPrefix}/${smartFolderParentId}/children?summary=true`, {
        cancelToken: source.token,
        mute: true,
      })
      .then((res: ResourceSummary[]) => {
        if (version !== requestVersionRef.current) return;
        setData(uniqueResources(res));
        offsetRef.current = 0;
        hasMoreRef.current = false;
        setHasMore(false);
      })
      .catch(error => {
        if (version !== requestVersionRef.current) return;
        if (error.response?.status === 404) {
          setData([]);
          offsetRef.current = 0;
          hasMoreRef.current = false;
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!finishRequest(version, source)) return;
        loadingRef.current = false;
        setLoading(false);
      });
  }, [apiPrefix, beginRequest, finishRequest, smartFolderParentId]);

  const replaceAll = useCallback(
    (resources: ResourceSummary[]) => {
      invalidateRequests();
      setLoading(false);
      setLoadingMore(false);
      setData(uniqueResources(resources));
      offsetRef.current = 0;
      hasMoreRef.current = false;
      setHasMore(false);
    },
    [invalidateRequests]
  );

  const loadMore = useCallback(() => {
    if (
      loadAll ||
      loadingRef.current ||
      loadingMoreRef.current ||
      !hasMoreRef.current
    ) {
      return;
    }

    const newOffset = offsetRef.current + PAGE_SIZE;
    const { source, version } = beginRequest();
    loadingMoreRef.current = true;
    setLoadingMore(true);
    http
      .get(
        `${apiPrefix}/${resourceId}/children?summary=true&offset=${newOffset}&limit=${PAGE_SIZE}${sortQuery}`,
        { cancelToken: source.token }
      )
      .then((res: ResourceSummary[]) => {
        if (version !== requestVersionRef.current) return;
        setData(current => mergeUniqueResources(current, res));
        offsetRef.current = newOffset;
        const nextHasMore = res.length === PAGE_SIZE;
        hasMoreRef.current = nextHasMore;
        setHasMore(nextHasMore);
      })
      .catch(error => {
        if (version !== requestVersionRef.current || axios.isCancel(error)) {
          return;
        }
        // The shared HTTP client reports the error; keep the offset retryable.
      })
      .finally(() => {
        if (!finishRequest(version, source)) return;
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [apiPrefix, beginRequest, finishRequest, loadAll, resourceId, sortQuery]);

  useEffect(() => {
    reload();
    return invalidateRequests;
  }, [invalidateRequests, reload]);

  return {
    data,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    reload,
    reloadSmartFolder,
    replaceAll,
    setData,
  };
}
