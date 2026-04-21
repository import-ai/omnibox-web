import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { showActionToast } from '@/components/sonner';
import useApp from '@/hooks/use-app';
import { Resource } from '@/interface';
import { sidebarApi } from '@/page/sidebar/store/sidebar-api';
import { useSidebarStore } from '@/page/sidebar/store/sidebar-store';

/**
 * Event adapter: maps app-level events to sidebar store actions.
 *
 * Only genuinely cross-module events are handled here:
 * - delete_resource, move_resource, generate_resource, restore_resource
 * - update_resource (editor/resource-tasks → sidebar)
 *
 * Sidebar-internal actions (expand, collapse, rename, scroll, etc.)
 * are called directly on the store by components.
 */
export function useSidebarEvents(namespaceId: string) {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const store = useSidebarStore.getState();
    const hooks: Array<() => void> = [];

    // AI generates resources
    hooks.push(
      app.on(
        'generate_resource',
        (_parentId: string, resource: Resource | Resource[]) => {
          const resources = Array.isArray(resource) ? resource : [resource];
          if (
            resources.length <= 0 ||
            !Array.isArray(resources[0].path) ||
            resources[0].path.length <= 0
          ) {
            return;
          }
          for (const res of resources) {
            store.restore(res);
          }
          const last = resources[resources.length - 1];
          store.activate(last.id);
          navigate(`/${namespaceId}/${last.id}`, {
            state: { fromSidebar: true },
          });
        }
      )
    );

    // Delete a resource
    hooks.push(
      app.on('delete_resource', (id: string) => {
        const match = window.location.pathname.match(
          new RegExp(`^/${namespaceId}/([^/]+)`)
        );
        const currentResourceId = match?.[1];
        const result = store.remove(id, currentResourceId);

        if (result.nextId) {
          navigate(`/${namespaceId}/${result.nextId}`, {
            state: { fromSidebar: true },
          });
        } else if (result.navigateToChat) {
          navigate(`/${namespaceId}/chat`);
        }

        showActionToast(t('resource.moved_to_trash'), {
          actionLabel: t('undo'),
          onAction: () => {
            sidebarApi
              .restore(namespaceId, id)
              .then(response => {
                const restoredId = store.restore(response);
                store.activate(restoredId);
                app.fire('trash_updated');
                const nowMatch = window.location.pathname.match(
                  new RegExp(`^/${namespaceId}/([^/]+)`)
                );
                const nowResourceId = nowMatch?.[1];
                if (!nowResourceId || nowResourceId === id) {
                  navigate(`/${namespaceId}/${restoredId}`, {
                    state: { fromSidebar: true },
                  });
                }
              })
              .catch(err => {
                console.error('[sidebar] restore failed:', err);
              });
          },
        });
      })
    );

    // Update a resource (name/content) — fired by editor / resource-tasks
    hooks.push(
      app.on('update_resource', (delta: Resource) => {
        store.patch(delta.id, {
          name: delta.name,
          content: delta.content,
        });
      })
    );

    // Restore from trash
    hooks.push(
      app.on('restore_resource', (resource: Resource) => {
        const id = store.restore(resource);
        store.activate(id);
        navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
      })
    );

    // Move a resource (UI update only — caller already made HTTP request)
    hooks.push(
      app.on('move_resource', (resourceId: string, targetId: string) => {
        store.move(resourceId, targetId);
      })
    );

    return () => {
      hooks.forEach(unsub => unsub());
    };
  }, [app, namespaceId, navigate, t]);
}
