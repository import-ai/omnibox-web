import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { showActionToast } from '@/components/sonner';
import useApp from '@/hooks/use-app';
import { Resource } from '@/interface';
import { useSidebarStore } from '@/page/sidebar/store';
import { fetchChildren, fetchResource } from '@/service/resource';

function extractResourceId(
  pathname: string,
  namespaceId: string
): string | undefined {
  const match = pathname.match(new RegExp(`^/${namespaceId}/([^/]+)`));
  return match?.[1];
}

async function resolveResourceList(
  namespaceId: string,
  resourceIdOrParentId: string,
  resource?: Resource | Resource[]
): Promise<Resource[]> {
  if (Array.isArray(resource)) {
    return resource;
  }
  if (resource) {
    return [resource];
  }
  if (!resourceIdOrParentId) {
    return [];
  }
  return [await fetchResource(namespaceId, resourceIdOrParentId)];
}

function scrollToResource(resourceId: string) {
  requestAnimationFrame(() => {
    const element = document.querySelector(
      `[data-resource-id="${resourceId}"]`
    );
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

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
    const handleGeneratedResource = async (
      resourceIdOrParentId: string,
      resource?: Resource | Resource[]
    ) => {
      const resources = await resolveResourceList(
        namespaceId,
        resourceIdOrParentId,
        resource
      );
      if (resources.length <= 0) {
        return;
      }
      for (const res of resources) {
        // Don't need to create because the other party has already done it
        await useSidebarStore.getState().restore(res);
      }
      const last = resources[resources.length - 1];
      useSidebarStore.getState().activate(last.id);
      navigate(`/${namespaceId}/${last.id}`);
    };
    const handleUpdatedResource = async (delta: Resource | string) => {
      const resource =
        typeof delta === 'string'
          ? await fetchResource(namespaceId, delta)
          : delta;

      useSidebarStore.getState().patch(resource.id, {
        name: resource.name,
        content: resource.content,
        hasChildren: resource.has_children,
      });
    };
    const handleRefreshResourceChildren = async (resourceId: string) => {
      const children = await fetchChildren(namespaceId, resourceId);
      useSidebarStore.getState().refreshChildren(resourceId, children);
    };
    const handleScrollToResource = async (
      targetId: string,
      parentId?: string
    ) => {
      if (parentId) {
        await handleRefreshResourceChildren(parentId);
      }
      await useSidebarStore
        .getState()
        .expandPathTo(targetId, { expandTarget: true });
      scrollToResource(targetId);
    };

    // The event bus treats a listener return value as the next listener's
    // argument, so async handlers must not return Promise here.
    hooks.push(
      app.on(
        'generate_resource',
        (resourceIdOrParentId: string, resource?: Resource | Resource[]) => {
          void handleGeneratedResource(resourceIdOrParentId, resource);
        }
      )
    );
    hooks.push(
      app.on('refresh_resource_children', (resourceId: string) => {
        void handleRefreshResourceChildren(resourceId);
      })
    );

    // Delete a resource
    hooks.push(
      app.on('delete_resource', (id: string) => {
        const currentResourceId = extractResourceId(
          window.location.pathname,
          namespaceId
        );
        const result = useSidebarStore.getState().remove(id, currentResourceId);

        if (result.nextId) {
          navigate(`/${namespaceId}/${result.nextId}`);
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
                navigate(`/${currentNs}/${restoredId}`);
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
      app.on('expand_resource', (resourceId: string) => {
        void useSidebarStore
          .getState()
          .expandPathTo(resourceId, { expandTarget: true });
      })
    );
    hooks.push(
      app.on('collapse_resource', (resourceId: string) => {
        useSidebarStore.getState().collapse(resourceId);
      })
    );
    hooks.push(
      app.on('scroll_to_resource', (targetId: string, parentId?: string) => {
        void handleScrollToResource(targetId, parentId);
      })
    );
    hooks.push(
      app.on('update_resource', (delta: Resource | string) => {
        void handleUpdatedResource(delta);
      })
    );
    hooks.push(
      app.on('refresh_resource', (delta: Resource | string) => {
        void handleUpdatedResource(delta);
      })
    );

    // Restore from trash
    hooks.push(
      app.on('restore_resource', (resource: Resource) => {
        void (async () => {
          const id = await useSidebarStore.getState().restore(resource);
          useSidebarStore.getState().activate(id);
          navigate(`/${namespaceId}/${id}`);
        })();
      })
    );

    return () => {
      hooks.forEach(unsub => unsub());
    };
  }, [namespaceId, navigate, t]);
}
