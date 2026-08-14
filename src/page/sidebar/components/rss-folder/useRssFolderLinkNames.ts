import { useEffect, useState, useSyncExternalStore } from 'react';

import type { RssFolderResponse } from './index';
import { fetchRssFolderConfig } from './rssFolderConfigApi';

/** `rss_links.id` -> the feed's display name, for the links that have one. */
export type RssFolderLinkNames = Record<string, string>;

/**
 * An rss item only carries its `attrs.link_id`; the feed's name lives on the
 * folder's config. Item rows are rendered one component per item (a folder
 * holds hundreds), so the request is memoised per folder and every row of that
 * folder shares it instead of asking for the config itself.
 */
const linkNamesCache = new Map<string, Promise<RssFolderLinkNames>>();

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
  linkNamesCache.delete(linkNamesKey(namespaceId, resourceId));
  publishLinkNamesChange();
}

/** Test seam: forget every memoised folder. */
export function clearRssFolderLinkNamesCache() {
  linkNamesCache.clear();
  publishLinkNamesChange();
}

export function loadRssFolderLinkNames(
  namespaceId: string,
  resourceId: string
): Promise<RssFolderLinkNames> {
  const key = linkNamesKey(namespaceId, resourceId);
  const cached = linkNamesCache.get(key);
  if (cached) {
    return cached;
  }

  const pending = fetchRssFolderConfig(namespaceId, resourceId, {
    // The name is decorative; a folder whose config we cannot read should not
    // raise an error toast behind the list it decorates.
    mute: true,
  })
    .then((response: RssFolderResponse) => {
      const names: RssFolderLinkNames = {};
      for (const link of response?.links || []) {
        // An unnamed feed has nothing to show, so it stays unresolved and its
        // items keep the normal resource icon.
        if (link?.id && link.name?.trim()) {
          names[link.id] = link.name;
        }
      }
      return names;
    })
    .catch(() => {
      // No permission, deleted folder, offline: fall back to plain rows. The
      // empty result stays memoised so one failure is not retried per item.
      return {} as RssFolderLinkNames;
    });
  linkNamesCache.set(key, pending);
  return pending;
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
