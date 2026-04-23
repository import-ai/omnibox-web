import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { showActionToast } from '@/components/sonner';
import useApp from '@/hooks/use-app';
import { Resource } from '@/interface';
import { useSidebarStore } from '@/page/sidebar/store';

/**
 * Event adapter: maps app-level events to sidebar store actions.
 *
 * Only genuinely cross-module events are handled here:
 * - delete_resource, generate_resource, restore_resource
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
    const hooks: Array<() => void> = [];

    // AI generates resources
    hooks.push(
      app.on(
        'generate_resource',
        async (_parentId: string, resource: Resource | Resource[]) => {
          const resources = Array.isArray(resource) ? resource : [resource];
          if (
            resources.length <= 0 ||
            !Array.isArray(resources[0].path) ||
            resources[0].path.length <= 0
          ) {
            return;
          }
          for (const res of resources) {
            // 不用 create 是因为对方已经创建
            await useSidebarStore.getState().restore(res);
          }
          const last = resources[resources.length - 1];
          useSidebarStore.getState().activate(last.id);
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
        const result = useSidebarStore.getState().remove(id, currentResourceId);

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
            useSidebarStore
              .getState()
              .restore(id)
              .then(restoredId => {
                app.fire('trash_updated');
                const currentNs = useSidebarStore.getState().namespaceId;
                const nowMatch = window.location.pathname.match(
                  new RegExp(`^/${currentNs}/([^/]+)`)
                );
                const nowResourceId = nowMatch?.[1];
                if (!nowResourceId || nowResourceId === id) {
                  navigate(`/${currentNs}/${restoredId}`, {
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
        useSidebarStore.getState().patch(delta.id, {
          name: delta.name,
          content: delta.content,
        });
      })
    );

    // Restore from trash
    hooks.push(
      app.on('restore_resource', async (resource: Resource) => {
        const id = await useSidebarStore.getState().restore(resource);
        useSidebarStore.getState().activate(id);
        navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
      })
    );

    return () => {
      hooks.forEach(unsub => unsub());
    };
  }, [namespaceId, navigate, t]);
}
