import axios from 'axios';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Resource } from '@/interface';
import { http } from '@/lib/request';
import { useNodesSize } from '@/page/sidebar/store/selectors';
import { useSidebarStore } from '@/page/sidebar/store/sidebar-store';

export function useSidebarInit() {
  const params = useParams();
  const navigate = useNavigate();
  const loc = useLocation();
  const namespaceId = params.namespace_id || '';
  const resourceId = params.resource_id || '';
  const chatPage = loc.pathname.includes('/chat');

  const autoExpandedRef = useRef<Set<string>>(new Set());
  const hasAutoNavigatedRef = useRef(false);
  const prevNodesSizeRef = useRef(0);
  const nodesSize = useNodesSize();

  // Set namespaceId for store API calls
  useEffect(() => {
    useSidebarStore.getState().setNamespaceId(namespaceId);
  }, [namespaceId]);

  // Clear auto-expanded keys when namespace changes
  useEffect(() => {
    autoExpandedRef.current.clear();
    hasAutoNavigatedRef.current = false;
  }, [namespaceId]);

  // Fetch root resources and initialize store
  useEffect(() => {
    if (!namespaceId) return;
    if (!localStorage.getItem('uid')) return;

    const source = axios.CancelToken.source();
    http
      .get<Record<string, Resource>>(`/namespaces/${namespaceId}/root`, {
        cancelToken: source.token,
      })
      .then(items => {
        useSidebarStore.getState().init(items);
      })
      .catch(() => {
        // Silently fail — error is handled by the http interceptor
      });

    return () => {
      source.cancel();
    };
  }, [namespaceId]);

  // Auto-expand path when resourceId changes
  useEffect(() => {
    if (!namespaceId || !resourceId || chatPage) return;
    if (nodesSize === 0) return;

    const key = `${namespaceId}:${resourceId}`;
    if (autoExpandedRef.current.has(key)) return;

    let cancelled = false;
    const store = useSidebarStore.getState();

    const target = store.nodes[resourceId];
    if (target) {
      // Already loaded - expand parents
      const parentIds: string[] = [];
      let current = store.nodes[resourceId];
      while (current?.parentId) {
        parentIds.unshift(current.parentId);
        current = store.nodes[current.parentId];
      }
      for (const pid of parentIds) {
        const p = store.nodes[pid];
        if (p && !p.expanded && p.hasChildren) {
          store.expand(pid).catch(err => {
            console.error('[sidebar] auto-expand failed:', err);
          });
        }
      }
      // If target has children, expand it too
      if (target.hasChildren && !target.expanded) {
        store.expand(resourceId).catch(err => {
          console.error('[sidebar] auto-expand target failed:', err);
        });
      }
      autoExpandedRef.current.add(key);
      // Scroll to element
      requestAnimationFrame(() => {
        if (cancelled) return;
        const element = document.querySelector(
          `[data-resource-id="${resourceId}"]`
        );
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      return () => {
        cancelled = true;
      };
    }

    // Not loaded - use expandPathTo
    autoExpandedRef.current.add(key);
    store.expandPathTo(resourceId).then(() => {
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
  }, [namespaceId, resourceId, chatPage, nodesSize]);

  // Auto-navigate to first resource when no resourceId and not on chat page
  useEffect(() => {
    if (resourceId || chatPage) return;
    if (nodesSize === 0) {
      prevNodesSizeRef.current = nodesSize;
      return;
    }
    // Reset auto-navigate when nodes are recreated after being empty
    if (prevNodesSizeRef.current === 0 && nodesSize > 0) {
      hasAutoNavigatedRef.current = false;
    }
    prevNodesSizeRef.current = nodesSize;
    if (hasAutoNavigatedRef.current) return;

    const store = useSidebarStore.getState();
    let firstNode: Resource | null = null;
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
  }, [chatPage, namespaceId, resourceId, nodesSize]);

  // Sync activeId from URL (only when URL changes, not when store.activeId changes)
  useEffect(() => {
    const store = useSidebarStore.getState();
    if (resourceId && store.activeId !== resourceId) {
      store.activate(resourceId);
    }
    // Only depend on resourceId to avoid racing with internal store navigation
  }, [resourceId]);

  return { namespaceId, resourceId, chatPage };
}
