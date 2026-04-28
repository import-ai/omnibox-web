import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Resource, ResourceMeta } from '@/interface';
import { type TreeNode, useSidebarStore } from '@/page/share/sidebar/store';

interface IProps {
  shareId: string;
  rootResource: ResourceMeta;
  currentResourceId?: string;
  currentResourcePath?: Array<{ id: string }>;
}

export function useSidebarInit(props: IProps) {
  const { shareId, rootResource, currentResourceId } = props;
  const navigate = useNavigate();
  // Auto-navigate to first resource when no resourceId and not on chat page
  const hasAutoNavigatedRef = useRef(false);
  const chatPage = useLocation().pathname.includes('/chat');

  // Derive initialization state from rootIds.
  // setNamespaceId() clears rootIds when namespace switches, so this is reliable.
  const initialized = useSidebarStore(s => s.rootIds.share !== '');

  useEffect(() => {
    // Reset auto-navigate flag when namespace changes
    hasAutoNavigatedRef.current = false;
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
            space_type: 'share',
            parent_id: virtualRootId,
          } as unknown as Resource,
        ],
      } as unknown as Resource & { children: Resource[] },
    });
  }, [rootResource, shareId]);

  const location = useLocation();

  // Auto-expand path when resourceId changes (only after roots are loaded)
  useEffect(() => {
    if (!initialized || !currentResourceId || chatPage) return;

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

    store.expandPathTo(currentResourceId, { expandTarget: true }).then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        const element = document.querySelector(
          `[data-resource-id="${currentResourceId}"]`
        );
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [initialized, currentResourceId, chatPage, location.pathname, navigate]);

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
    if (currentResourceId && store.activeId !== currentResourceId) {
      store.activate(currentResourceId);
    }
    // Only depend on resourceId to avoid racing with internal store navigation
  }, [currentResourceId]);

  return { shareId, currentResourceId };
}
