import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Resource } from '@/interface';
import { http } from '@/lib/request';
import { type TreeNode, useSidebarStore } from '@/page/sidebar/store';

export function useSidebarInit() {
  const params = useParams();
  const navigate = useNavigate();
  // Auto-navigate to first resource when no resourceId and not on chat page
  const hasAutoNavigatedRef = useRef(false);
  const resourceId = params.resource_id || '';
  const namespaceId = params.namespace_id || '';
  const chatPage = useLocation().pathname.includes('/chat');

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
    http
      .get<Record<string, Resource>>(`/namespaces/${namespaceId}/root`, {
        signal: controller.signal,
      })
      .then(items => {
        useSidebarStore.getState().init(items);
      })
      .catch(() => {
        // Silently fail — error is handled by the http interceptor
      });

    return () => {
      controller.abort();
    };
  }, [namespaceId]);

  // Auto-expand path when resourceId changes (only after roots are loaded)
  useEffect(() => {
    if (!initialized || !resourceId || chatPage) return;

    let cancelled = false;
    const store = useSidebarStore.getState();

    store.expandPathTo(resourceId, { expandTarget: true }).then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        const element = document.querySelector(
          `[data-resource-id="${resourceId}"]`
        );
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [initialized, resourceId, chatPage]);

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
    if (resourceId && store.activeId !== resourceId) {
      store.activate(resourceId);
    }
    // Only depend on resourceId to avoid racing with internal store navigation
  }, [resourceId]);

  return { namespaceId, resourceId };
}
