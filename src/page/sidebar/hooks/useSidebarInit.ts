import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { getSmartFolderParentIdFromChildKey } from '@/page/sidebar/components/smart-folder';
import { type TreeNode, useSidebarStore } from '@/page/sidebar/store';
import type { ResourceSorts } from '@/page/sidebar/store/resourceSort';
import { fetchRootResources } from '@/service/resource';
import { fetchResourceSortPreferences } from '@/service/resourceSortPreference';

interface IProps {
  resourceId: string;
  namespaceId: string;
}

export function useSidebarInit(props: IProps) {
  const { namespaceId, resourceId } = props;
  const navigate = useNavigate();
  const location = useLocation();
  // Auto-navigate to first resource when no resourceId and not on chat page
  const hasAutoNavigatedRef = useRef(false);
  const chatPage = location.pathname.includes('/chat');
  const rssItemPage = location.pathname.includes('/rss-items/');

  // Derive initialization state from rootIds.
  // setNamespaceId() clears rootIds when namespace switches, so this is reliable.
  const initialized = useSidebarStore(
    s => s.rootIds.private !== '' || s.rootIds.teamspace !== ''
  );

  useEffect(() => {
    // Reset auto-navigate flag when namespace changes
    hasAutoNavigatedRef.current = false;
    // Set namespaceId (also clears old nodes/rootIds/ui/activeId)
    useSidebarStore.getState().setNamespaceId(namespaceId);
  }, [namespaceId]);

  // Fetch root resources
  useEffect(() => {
    if (!namespaceId) return;
    if (!localStorage.getItem('uid')) return;

    const controller = new AbortController();
    const localSorts = useSidebarStore.getState().resourceSorts;
    fetchResourceSortPreferences(namespaceId, {
      signal: controller.signal,
      mute: true,
    })
      .then(
        preferences =>
          ({
            private: {
              sort_by: preferences.private.sort_by,
              sort_order: preferences.private.sort_order,
            },
            teamspace: {
              sort_by: preferences.teamspace.sort_by,
              sort_order: preferences.teamspace.sort_order,
            },
          }) satisfies ResourceSorts
      )
      .catch(() => localSorts)
      .then((sorts: ResourceSorts) => {
        if (controller.signal.aborted) return;
        useSidebarStore.getState().setResourceSorts({
          private: {
            sort_by: sorts.private.sort_by,
            sort_order: sorts.private.sort_order,
          },
          teamspace: {
            sort_by: sorts.teamspace.sort_by,
            sort_order: sorts.teamspace.sort_order,
          },
        });
        return Promise.all([
          fetchRootResources(
            namespaceId,
            { signal: controller.signal },
            sorts.private
          ),
          fetchRootResources(
            namespaceId,
            { signal: controller.signal },
            sorts.teamspace
          ),
        ]);
      })
      .then(result => {
        if (!result || controller.signal.aborted) return;
        const [privateRoots, teamspaceRoots] = result;
        useSidebarStore.getState().init({
          ...privateRoots,
          ...(teamspaceRoots.teamspace
            ? { teamspace: teamspaceRoots.teamspace }
            : {}),
        });
      })
      .catch(err => {
        console.error('[sidebar] failed to fetch root resources:', err);
      });

    return () => {
      controller.abort();
    };
  }, [namespaceId]);

  // Auto-expand path when resourceId changes (only after roots are loaded)
  useEffect(() => {
    if (!initialized || !resourceId || chatPage) return;

    const isFromSidebar = location.state?.fromSidebar === true;
    if (isFromSidebar) {
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, fromSidebar: undefined },
      });
      return;
    }

    let cancelled = false;
    const store = useSidebarStore.getState();
    const persistedActiveKey = location.state?.sidebarActiveKey;
    const smartFolderParentId =
      typeof persistedActiveKey === 'string'
        ? getSmartFolderParentIdFromChildKey(persistedActiveKey, resourceId)
        : null;
    const expandId = smartFolderParentId ?? resourceId;
    const scrollTargetId =
      typeof persistedActiveKey === 'string' ? persistedActiveKey : resourceId;

    store.expandPathTo(expandId, { expandTarget: true }).then(() => {
      if (cancelled || rssItemPage) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        const element = document.querySelector(
          `[data-resource-id="${scrollTargetId}"]`
        );
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [initialized, resourceId, chatPage, location.pathname, navigate]);

  useEffect(() => {
    if (!initialized || resourceId || chatPage) return;
    if (hasAutoNavigatedRef.current) return;

    const store = useSidebarStore.getState();
    let firstNode: TreeNode | null = null;
    for (const [, rootId] of Object.entries(store.rootIds)) {
      const root = store.nodes[rootId];
      if (root?.children.length) {
        firstNode = store.nodes[root.children[0]] || null;
        if (firstNode) break;
      }
    }
    if (firstNode?.id) {
      hasAutoNavigatedRef.current = true;
      navigate(`/${namespaceId}/${firstNode.id}`);
    }
  }, [initialized, resourceId, chatPage, namespaceId, navigate]);

  // Sync activeId from URL (only when URL changes, not when store.activeId changes)
  useEffect(() => {
    const store = useSidebarStore.getState();
    const sidebarActiveKey =
      typeof location.state?.sidebarActiveKey === 'string'
        ? location.state.sidebarActiveKey
        : resourceId;
    if (chatPage) {
      if (store.activeId) {
        store.activate(null);
      }
      return;
    }
    if (sidebarActiveKey && store.activeId !== sidebarActiveKey) {
      store.activate(sidebarActiveKey);
    }
    // Only depend on resourceId to avoid racing with internal store navigation
  }, [resourceId, chatPage, location.state]);

  return { namespaceId, resourceId };
}
