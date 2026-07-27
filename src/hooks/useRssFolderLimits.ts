import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import { http } from '@/lib/request';
import { RssFolderLimits } from '@/page/sidebar/components/rss-folder';

interface IProps {
  namespaceId?: string;
  disabled?: boolean;
}

type RssFolderLimitsResponse = {
  tier: RssFolderLimits['tier'];
  link_limit?: number;
};

const cachedLimits = new Map<string, RssFolderLimits>();
const pendingRequests = new Map<string, Promise<RssFolderLimits | undefined>>();

function normalizeRssFolderLimits(
  response: RssFolderLimitsResponse
): RssFolderLimits {
  return {
    tier: response.tier,
    linkLimit: response.link_limit ?? 1,
  };
}

export default function useRssFolderLimits(props?: IProps) {
  const { namespaceId, disabled = false } = props || {};
  const mountedRef = useRef(false);
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<RssFolderLimits>();
  const currentUserId = localStorage.getItem('uid') || '';
  const cacheKey =
    namespaceId && currentUserId ? `${currentUserId}:${namespaceId}` : '';

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(
    (force: boolean = false) => {
      if (disabled || !namespaceId) {
        return;
      }
      if (!currentUserId || !cacheKey) {
        return;
      }

      const cached = cachedLimits.get(cacheKey);
      if (!force && cached) {
        if (mountedRef.current) {
          onData(cached);
        }
        return;
      }

      const pending = pendingRequests.get(cacheKey);
      if (pending) {
        pending.then(result => {
          if (result && mountedRef.current) {
            onData(result);
          }
        });
        return;
      }

      onLoading(true);
      const source = axios.CancelToken.source();
      const request = http
        .get<RssFolderLimitsResponse>(
          `/namespaces/${namespaceId}/rss-folders/limits`,
          {
            cancelToken: source.token,
          }
        )
        .then(response => {
          if (!response) {
            return undefined;
          }

          const normalized = normalizeRssFolderLimits(response);
          cachedLimits.set(cacheKey, normalized);
          if (mountedRef.current) {
            onData(normalized);
          }
          return normalized;
        })
        .finally(() => {
          pendingRequests.delete(cacheKey);
          if (mountedRef.current) {
            onLoading(false);
          }
        });

      pendingRequests.set(cacheKey, request);

      return () => {
        source.cancel();
      };
    },
    [cacheKey, currentUserId, disabled, namespaceId]
  );

  useEffect(() => {
    if (disabled || !namespaceId) {
      return;
    }

    const cancelRequest = refetch();

    return () => {
      cancelRequest?.();
    };
  }, [disabled, namespaceId, refetch]);

  return { data, loading, refetch };
}
