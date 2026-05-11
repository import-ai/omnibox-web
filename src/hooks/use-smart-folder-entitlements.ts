import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import { http } from '@/lib/request';
import { SmartFolderEntitlements } from '@/page/sidebar/content/smart-folder-types';

import useApp from './use-app';

interface IProps {
  namespaceId?: string;
  disabled?: boolean;
}

type SmartFolderEntitlementsResponse = {
  tier: SmartFolderEntitlements['tier'];
  private_limit?: number;
  team_limit?: number;
  private_used?: number;
  team_used?: number;
  rule_limit?: number;
  trash_retention_days?: number;
};

const cachedEntitlements = new Map<string, SmartFolderEntitlements>();
const pendingRequests = new Map<
  string,
  Promise<SmartFolderEntitlements | undefined>
>();

function normalizeSmartFolderEntitlements(
  response: SmartFolderEntitlementsResponse
): SmartFolderEntitlements {
  return {
    tier: response.tier,
    privateLimit: response.private_limit ?? 1,
    teamLimit: response.team_limit ?? 1,
    privateUsed: response.private_used ?? 0,
    teamUsed: response.team_used ?? 0,
    ruleLimit: response.rule_limit ?? 3,
    trashRetentionDays: response.trash_retention_days ?? 7,
  };
}

export default function useSmartFolderEntitlements(props?: IProps) {
  const { namespaceId, disabled = false } = props || {};
  const app = useApp();
  const mountedRef = useRef(false);
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<SmartFolderEntitlements>();
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

      const cached = cachedEntitlements.get(cacheKey);
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
        .get<SmartFolderEntitlementsResponse>(
          `/namespaces/${namespaceId}/smart-folders/entitlements`,
          {
            cancelToken: source.token,
          }
        )
        .then(response => {
          if (!response) {
            return undefined;
          }

          const normalized = normalizeSmartFolderEntitlements(response);
          cachedEntitlements.set(cacheKey, normalized);
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
    const offRefetch = app.on('smart_folder_entitlements_refetch', () =>
      refetch(true)
    );

    return () => {
      cancelRequest?.();
      offRefetch();
    };
  }, [app, disabled, namespaceId, refetch]);

  return { data, loading, refetch };
}
