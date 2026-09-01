import { useEffect, useState, useSyncExternalStore } from 'react';

import type { RssFolderInitialSyncStatus, RssFolderResponse } from './index';
import { fetchRssFolderConfig } from './rssFolderConfigApi';

/** `rss_links.id` -> the feed's display name, for the links that have one. */
export type RssFolderLinkNames = Record<string, string>;

/**
 * An rss item only carries its `attrs.link_id`; the feed's name lives on the
 * folder's config. Item rows are rendered one component per item (a folder
 * holds hundreds), so the request is memoised per folder and every row of that
 * folder shares it instead of asking for the config itself.
 */
const RSS_SYNC_POLL_INTERVAL = 2000;
const configCache = new Map<
  string,
  {
    requestedAt: number;
    promise: Promise<RssFolderResponse | null | undefined>;
  }
>();

// Rows already on screen when a feed is renamed have to re-read, so an
// invalidation is published rather than just dropped from the map.
let linkNamesVersion = 0;
const linkNamesListeners = new Set<() => void>();

function subscribeToLinkNames(listener: () => void) {
  linkNamesListeners.add(listener);
  return () => {
    linkNamesListeners.delete(listener);
  };
}

function getLinkNamesVersion() {
  return linkNamesVersion;
}

function publishLinkNamesChange() {
  linkNamesVersion += 1;
  for (const listener of linkNamesListeners) {
    listener();
  }
}

function linkNamesKey(namespaceId: string, resourceId: string) {
  return `${namespaceId}/${resourceId}`;
}

/** Drops a folder's memoised names so every reader refetches them. */
export function invalidateRssFolderLinkNames(
  namespaceId: string,
  resourceId: string
) {
  configCache.delete(linkNamesKey(namespaceId, resourceId));
  publishLinkNamesChange();
}

/** Test seam: forget every memoised folder. */
export function clearRssFolderLinkNamesCache() {
  configCache.clear();
  publishLinkNamesChange();
}

/**
 * A refusal — no permission, no such folder — is the folder's settled answer
 * and stays memoised. Anything else (offline, a gateway blip, a 500) is about
 * this attempt, not this folder, so it must not silence the badge for the rest
 * of the session.
 */
const SETTLED_FAILURE_STATUSES = [401, 403, 404];

function isSettledFailure(error: unknown): boolean {
  const status = (error as { response?: { status?: number }; status?: number })
    ?.response?.status;
  return (
    typeof status === 'number' && SETTLED_FAILURE_STATUSES.includes(status)
  );
}

function loadRssFolderConfigResponse(
  namespaceId: string,
  resourceId: string,
  refresh = false
): Promise<RssFolderResponse | null | undefined> {
  const key = linkNamesKey(namespaceId, resourceId);
  const cached = configCache.get(key);
  if (
    cached &&
    (!refresh || Date.now() - cached.requestedAt < RSS_SYNC_POLL_INTERVAL)
  ) {
    return cached.promise;
  }

  const pending = fetchRssFolderConfig(namespaceId, resourceId, {
    mute: true,
  }).catch((error: unknown) => {
    const retryable = !isSettledFailure(error);
    if (retryable && configCache.get(key)?.promise === pending) {
      configCache.delete(key);
    }
    return retryable ? undefined : null;
  });
  configCache.set(key, { requestedAt: Date.now(), promise: pending });
  return pending;
}

export function loadRssFolderLinkNames(
  namespaceId: string,
  resourceId: string
): Promise<RssFolderLinkNames> {
  return loadRssFolderConfigResponse(namespaceId, resourceId).then(response => {
    const names: RssFolderLinkNames = {};
    for (const link of response?.links || []) {
      // An unnamed feed has nothing to show, so it stays unresolved and its
      // items keep the normal resource icon.
      if (link?.id && link.name?.trim()) {
        names[link.id] = link.name;
      }
    }
    return names;
  });
}

export function useRssFolderInitialSyncStatus(
  namespaceId: string | undefined,
  resourceId: string | undefined | null,
  enabled = true
): RssFolderInitialSyncStatus | undefined {
  const [status, setStatus] = useState<RssFolderInitialSyncStatus>();
  const canLoad = enabled && !!namespaceId && !!resourceId;
  const version = useSyncExternalStore(
    subscribeToLinkNames,
    getLinkNamesVersion,
    getLinkNamesVersion
  );

  useEffect(() => {
    if (!canLoad) {
      setStatus(undefined);
      return;
    }

    setStatus(undefined);
    let active = true;
    let timer: number | undefined;
    const load = (refresh = false) => {
      loadRssFolderConfigResponse(namespaceId, resourceId, refresh).then(
        response => {
          if (!active) return;
          if (response === undefined) {
            timer = window.setTimeout(() => load(true), RSS_SYNC_POLL_INTERVAL);
            return;
          }
          const nextStatus = response?.initial_sync_status ?? 'failed';
          setStatus(nextStatus);
          if (nextStatus === 'pending' || nextStatus === 'polling') {
            timer = window.setTimeout(() => load(true), RSS_SYNC_POLL_INTERVAL);
          }
        }
      );
    };
    load();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [canLoad, namespaceId, resourceId, version]);

  return status;
}

/**
 * The feed names of an rss folder, keyed by link id. Empty until they load, and
 * empty for good when there is nothing to resolve against (no namespace, no
 * folder, or a caller that is not looking at an rss folder of its own
 * namespace).
 */
export function useRssFolderLinkNames(
  namespaceId: string | undefined,
  resourceId: string | undefined | null,
  enabled = true
): RssFolderLinkNames {
  const [linkNames, setLinkNames] = useState<RssFolderLinkNames>({});
  const canLoad = enabled && !!namespaceId && !!resourceId;
  const version = useSyncExternalStore(
    subscribeToLinkNames,
    getLinkNamesVersion,
    getLinkNamesVersion
  );

  useEffect(() => {
    if (!canLoad) {
      setLinkNames({});
      return;
    }

    let active = true;
    loadRssFolderLinkNames(namespaceId, resourceId).then(names => {
      if (active) {
        setLinkNames(names);
      }
    });
    return () => {
      active = false;
    };
  }, [canLoad, namespaceId, resourceId, version]);

  return linkNames;
}

/**
 * The feed name to show on a single rss item row, or undefined when the row is
 * not an rss item or its link no longer resolves to a named feed.
 */
export function useRssItemFeedName(
  namespaceId: string | undefined,
  item: {
    resourceType?: string;
    folderId?: string | null;
    attrs?: Record<string, unknown> | null;
  }
): string | undefined {
  const linkId = item.attrs?.link_id;
  const resolvableLinkId = typeof linkId === 'string' ? linkId : '';
  const linkNames = useRssFolderLinkNames(
    namespaceId,
    item.folderId,
    item.resourceType === 'rss_item' && !!resolvableLinkId
  );
  return linkNames[resolvableLinkId];
}
