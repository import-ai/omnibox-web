import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { navigateToResource } from '@/page/resource/resourceNavigation';
import { getSmartFolderParentIdFromChildKey } from '@/page/sidebar/components/smart-folder';
import { type TreeNode, useSidebarStore } from '@/page/sidebar/store';
import {
  clearSidebarActiveKeyFromState,
  locateSidebarResource,
} from '@/page/sidebar/utils';
import { fetchRootResources } from '@/service/resource';

interface IProps {
  previewResourceId: string | null;
  resourceId: string;
  namespaceId: string;
}

export function useSidebarInit(props: IProps) {
  const { namespaceId, previewResourceId, resourceId } = props;
  const navigate = useNavigate();
  const location = useLocation();
  // Auto-navigate to first resource when no resourceId and not on chat page
  const hasAutoNavigatedRef = useRef(false);
  const chatPage = location.pathname.includes('/chat');
  // An rss item is an ordinary resource now, so no rss-item route is special
  // cased here any more.
  const currentResourceId = previewResourceId || resourceId;

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
    const sorts = useSidebarStore.getState().resourceSorts;
    fetchRootResources(namespaceId, { signal: controller.signal }, sorts)
      .then(roots => {
        useSidebarStore.getState().init(roots);
      })
      .catch(err => {
        console.error('[sidebar] failed to fetch root resources:', err);
      });

    return () => {
      controller.abort();
    };
  }, [namespaceId]);

  // Auto-expand path when the visible resource changes (only after roots load).
  useEffect(() => {
    if (!initialized || !currentResourceId) return;
    if (chatPage && !previewResourceId) return;

    if (previewResourceId) {
      const controller = new AbortController();
      const targetId = previewResourceId;
      void locateSidebarResource(targetId, {
        signal: controller.signal,
        shouldApply: () => !controller.signal.aborted,
      });
      return () => {
        controller.abort();
      };
    }

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
        ? getSmartFolderParentIdFromChildKey(
            persistedActiveKey,
            currentResourceId
          )
        : null;
    const expandId = smartFolderParentId ?? currentResourceId;
    const scrollTargetId =
      typeof persistedActiveKey === 'string'
        ? persistedActiveKey
        : currentResourceId;

    store.expandPathTo(expandId, { expandTarget: true }).then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        const element = document.querySelector(
          `[data-resource-id="${scrollTargetId}"]`
        );
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    initialized,
    currentResourceId,
    chatPage,
    location.pathname,
    navigate,
    previewResourceId,
  ]);

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
      navigateToResource(navigate, `/${namespaceId}/${firstNode.id}`);
    }
  }, [initialized, resourceId, chatPage, namespaceId, navigate]);

  // Sync activeId from the resource currently visible in the workspace.
  useEffect(() => {
    const store = useSidebarStore.getState();
    if (previewResourceId) {
      const { changed, nextState } = clearSidebarActiveKeyFromState(
        location.state
      );
      if (changed) {
        navigate(location.pathname, { replace: true, state: nextState });
      }
      if (store.activeId !== previewResourceId) {
        store.activate(previewResourceId);
      }
      return;
    }
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
    // Avoid depending on activeId so internal tree navigation cannot race here.
  }, [
    resourceId,
    previewResourceId,
    chatPage,
    location.pathname,
    location.state,
    navigate,
  ]);

  return { namespaceId, resourceId: currentResourceId };
}
