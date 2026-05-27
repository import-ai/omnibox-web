import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Resource, ResourceMeta } from '@/interface';
import { type TreeNode, useSidebarStore } from '@/page/share/sidebar/store';
import { getSmartFolderParentIdFromChildKey } from '@/page/sidebar/components/smart-folder';

interface IProps {
  shareId: string;
  rootResource: ResourceMeta;
  currentResourceId?: string;
  currentResourcePath?: Array<{ id: string }>;
  canBrowseResources: boolean;
}

export function useSidebarInit(props: IProps) {
  const { shareId, rootResource, currentResourceId, canBrowseResources } =
    props;
  const navigate = useNavigate();
  // Auto-navigate to first resource when no resourceId and not on chat page
  const hasAutoNavigatedRef = useRef(false);
  const autoExpandedAllKeyRef = useRef<string | null>(null);
  const chatPage = useLocation().pathname.includes('/chat');

  // Derive initialization state from rootIds.
  // setNamespaceId() clears rootIds when namespace switches, so this is reliable.
  const initialized = useSidebarStore(s => s.rootIds.share !== '');

  useEffect(() => {
    // Reset auto-navigate flag when namespace changes
    hasAutoNavigatedRef.current = false;
    autoExpandedAllKeyRef.current = null;
    // Set namespaceId (also clears old nodes/rootIds/ui/activeId)
    useSidebarStore.getState().setNamespaceId(shareId);
  }, [shareId]);

  // Initialize the existing tree store with the public share root.
  useEffect(() => {
    if (!shareId) return;
    const virtualRootId = `share-root-${rootResource.id}`;
    useSidebarStore.getState().init({
      share: {
        ...rootResource,
        id: virtualRootId,
        space_type: 'share',
        parent_id: '',
        has_children: true,
        children: [
          {
            ...rootResource,
            has_children: canBrowseResources
              ? rootResource.has_children
              : false,
            space_type: 'share',
            parent_id: virtualRootId,
          } as unknown as Resource,
        ],
      } as unknown as Resource & { children: Resource[] },
    });
  }, [canBrowseResources, rootResource, shareId]);

  const location = useLocation();

  // Auto-expand path when resourceId changes (only after roots are loaded)
  useEffect(() => {
    if (!initialized || !currentResourceId || chatPage) return;

    const isFromSidebar = location.state?.fromSidebar === true;
    const shouldSkipPathExpand =
      location.state?.skipShareSidebarPathExpand === true;
    if (isFromSidebar || shouldSkipPathExpand) {
      navigate(location.pathname, {
        replace: true,
        state: {
          ...location.state,
          fromSidebar: undefined,
          skipShareSidebarPathExpand: undefined,
          sidebarExpandParentId: undefined,
        },
      });
      // Ensure the smart folder parent is expanded so composite-key children
      // exist in the sidebar and can be highlighted.
      if (shouldSkipPathExpand) {
        const expandParentId = location.state?.sidebarExpandParentId;
        const scrollKey = location.state?.sidebarActiveKey ?? currentResourceId;
        if (typeof expandParentId === 'string') {
          useSidebarStore
            .getState()
            .expandPathTo(expandParentId, { expandTarget: true })
            .then(() => {
              requestAnimationFrame(() => {
                const element = document.querySelector(
                  `[data-resource-id="${scrollKey}"]`
                );
                if (element) {
                  element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                }
              });
            });
        }
      }
      return;
    }

    let cancelled = false;
    const store = useSidebarStore.getState();

    // If the persisted sidebarActiveKey is a smart-folder composite key for
    // this resource, expand the smart folder parent instead of expanding the
    // resource's own (unrelated) backend path. This keeps the composite-key
    // node alive in the sidebar after a page reload.
    const persistedActiveKey = location.state?.sidebarActiveKey;
    const smartFolderParentId =
      typeof persistedActiveKey === 'string'
        ? getSmartFolderParentIdFromChildKey(
            persistedActiveKey,
            currentResourceId
          )
        : null;

    const expandId = smartFolderParentId ?? currentResourceId;
    const expandTarget = smartFolderParentId ? true : canBrowseResources;
    const scrollTargetId = persistedActiveKey ?? currentResourceId;

    store.expandPathTo(expandId, { expandTarget }).then(() => {
      if (cancelled) return;
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
  }, [
    initialized,
    currentResourceId,
    chatPage,
    canBrowseResources,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    if (!initialized || !canBrowseResources) return;
    const key = `${shareId}:${rootResource.id}`;
    if (autoExpandedAllKeyRef.current === key) return;

    autoExpandedAllKeyRef.current = key;
    useSidebarStore.getState().expandAllFrom(rootResource.id);
  }, [initialized, canBrowseResources, rootResource.id, shareId]);

  useEffect(() => {
    if (!initialized || currentResourceId || chatPage) return;
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
      navigate(`/s/${shareId}/${firstNode.id}`);
    }
  }, [initialized, currentResourceId, chatPage, shareId, navigate]);

  // Sync activeId from URL (only when URL changes, not when store.activeId changes)
  useEffect(() => {
    const store = useSidebarStore.getState();
    const sidebarActiveKey =
      typeof location.state?.sidebarActiveKey === 'string'
        ? location.state.sidebarActiveKey
        : currentResourceId;
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
  }, [currentResourceId, chatPage, location.state]);

  return { shareId, currentResourceId };
}
