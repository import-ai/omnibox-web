import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import { http } from '@/lib/request';
import { RssFolderLimits } from '@/page/sidebar/components/rss-folder';
import { useSidebarStore } from '@/page/sidebar/store';

interface IProps {
  namespaceId?: string;
  disabled?: boolean;
}

type RssFolderLimitsResponse = {
  tier: RssFolderLimits['tier'];
  link_limit?: number;
  folder_private_limit?: number;
  folder_team_limit?: number;
  folder_private_used?: number;
  folder_team_used?: number;
};

const cachedLimits = new Map<string, RssFolderLimits>();
const pendingRequests = new Map<string, Promise<RssFolderLimits | undefined>>();

function normalizeRssFolderLimits(
  response: RssFolderLimitsResponse
): RssFolderLimits {
  return {
    tier: response.tier,
    linkLimit: response.link_limit ?? 1,
    folderPrivateLimit: response.folder_private_limit ?? 1,
    folderTeamLimit: response.folder_team_limit ?? 1,
    folderPrivateUsed: response.folder_private_used ?? 0,
    folderTeamUsed: response.folder_team_used ?? 0,
  };
}

export default function useRssFolderLimits(props?: IProps) {
  const { namespaceId, disabled = false } = props || {};
  const mountedRef = useRef(false);
  const refetchVersionRef = useRef(0);
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<RssFolderLimits>();
  const limitsVersion = useSidebarStore(state => state.rssFolderLimitsVersion);
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

      // Drop stale cache on forced refetch so a cancelled in-flight request
      // cannot leave create/delete menus stuck on the previous used count.
      if (force) {
        cachedLimits.delete(cacheKey);
      }

      const cached = cachedLimits.get(cacheKey);
      if (!force && cached) {
        if (mountedRef.current) {
          onData(cached);
        }
        return;
      }

      const pending = pendingRequests.get(cacheKey);
      // force must not reuse a pre-create in-flight response.
      if (pending && !force) {
        // Attach to the in-flight request and reflect its loading state; the
        // .catch keeps a rejected shared request from surfacing as an unhandled
        // rejection here (the originating caller handles the error).
        if (mountedRef.current) {
          onLoading(true);
        }
        pending
          .then(result => {
            if (result && mountedRef.current) {
              onData(result);
            }
          })
          .catch(() => undefined)
          .finally(() => {
            if (mountedRef.current) {
              onLoading(false);
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

    const force = refetchVersionRef.current !== limitsVersion;
    refetchVersionRef.current = limitsVersion;
    const cancelRequest = refetch(force);

    return () => {
      cancelRequest?.();
    };
  }, [disabled, limitsVersion, namespaceId, refetch]);

  return { data, loading, refetch };
}
