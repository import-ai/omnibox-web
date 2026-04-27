import axios from 'axios';
import { useEffect, useState } from 'react';

import { http } from '@/lib/request';
import { SmartFolderEntitlements } from '@/page/sidebar/content/smart-folder-types';

import useApp from './use-app';

interface IProps {
  namespaceId?: string;
  disabled?: boolean;
}

type SmartFolderEntitlementsResponse = SmartFolderEntitlements & {
  private_limit?: number;
  team_limit?: number;
  private_used?: number;
  team_used?: number;
  rule_limit?: number;
  trash_retention_days?: number;
};

const cachedEntitlements = new Map<string, SmartFolderEntitlements>();
const pendingRequests = new Map<string, Promise<SmartFolderEntitlements>>();

function normalizeSmartFolderEntitlements(
  response: SmartFolderEntitlementsResponse
): SmartFolderEntitlements {
  return {
    tier: response.tier,
    privateLimit: response.privateLimit ?? response.private_limit ?? 1,
    teamLimit: response.teamLimit ?? response.team_limit ?? 1,
    privateUsed: response.privateUsed ?? response.private_used ?? 0,
    teamUsed: response.teamUsed ?? response.team_used ?? 0,
    ruleLimit: response.ruleLimit ?? response.rule_limit ?? 3,
    trashRetentionDays:
      response.trashRetentionDays ?? response.trash_retention_days ?? 7,
  };
}

export default function useSmartFolderEntitlements(props?: IProps) {
  const { namespaceId, disabled = false } = props || {};
  const app = useApp();
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<SmartFolderEntitlements>();
  const currentUserId = localStorage.getItem('uid') || '';
  const cacheKey =
    namespaceId && currentUserId ? `${currentUserId}:${namespaceId}` : '';

  const refetch = (force: boolean = false) => {
    if (disabled || !namespaceId) {
      return;
    }
    if (!currentUserId || !cacheKey) {
      return;
    }

    const cached = cachedEntitlements.get(cacheKey);
    if (!force && cached) {
      onData(cached);
      return;
    }

    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      pending.then(onData);
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
        const normalized = normalizeSmartFolderEntitlements(response);
        cachedEntitlements.set(cacheKey, normalized);
        onData(normalized);
        return normalized;
      })
      .finally(() => {
        pendingRequests.delete(cacheKey);
        onLoading(false);
      });

    pendingRequests.set(cacheKey, request);

    return () => {
      source.cancel();
    };
  };

  useEffect(() => {
    if (disabled || !namespaceId) {
      return;
    }

    refetch();
    return app.on('smart_folder_entitlements_refetch', () => refetch(true));
  }, [app, cacheKey, currentUserId, disabled, namespaceId]);

  return { data, loading, refetch };
}
