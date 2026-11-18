import { useEffect, useRef, useState } from 'react';

import { http } from '@/lib/request';
import type { SmartFolderEntitlements } from '@/page/sidebar/components/smart-folder';
import { useSidebarStore } from '@/page/sidebar/store';

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

function fetchEntitlements(namespaceId: string, cacheKey: string) {
  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  // The request is shared by all consumers of this key. Unsubscribing one
  // consumer must not cancel the request for the others.
  const request = http
    .get<SmartFolderEntitlementsResponse>(
      `/namespaces/${namespaceId}/smart-folders/entitlements`
    )
    .then(response => {
      if (!response) return undefined;
      const data = normalizeSmartFolderEntitlements(response);
      cachedEntitlements.set(cacheKey, data);
      return data;
    })
    .catch(() => undefined)
    .finally(() => pendingRequests.delete(cacheKey));

  pendingRequests.set(cacheKey, request);
  return request;
}

export default function useSmartFolderEntitlements(props?: IProps) {
  const { namespaceId, disabled = false } = props || {};
  const refetchVersionRef = useRef(0);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data?: SmartFolderEntitlements;
    loading: boolean;
  }>();
  const entitlementsVersion = useSidebarStore(
    state => state.smartFolderEntitlementsVersion
  );
  const currentUserId = localStorage.getItem('uid');
  const cacheKey =
    !disabled && namespaceId && currentUserId
      ? `${currentUserId}:${namespaceId}`
      : '';

  useEffect(() => {
    if (!cacheKey || !namespaceId) return;

    const force = refetchVersionRef.current !== entitlementsVersion;
    refetchVersionRef.current = entitlementsVersion;
    const cached = cachedEntitlements.get(cacheKey);
    const shouldFetch = force || !cached;
    setSnapshot({ key: cacheKey, data: cached, loading: shouldFetch });
    if (!shouldFetch) return;

    let active = true;
    void fetchEntitlements(namespaceId, cacheKey).then(data => {
      if (active) {
        setSnapshot({ key: cacheKey, data: data ?? cached, loading: false });
      }
    });

    return () => {
      active = false;
    };
  }, [cacheKey, entitlementsVersion, namespaceId]);

  if (cacheKey && snapshot?.key === cacheKey) {
    return { data: snapshot.data, loading: snapshot.loading };
  }
  return { data: undefined, loading: Boolean(cacheKey) };
}
