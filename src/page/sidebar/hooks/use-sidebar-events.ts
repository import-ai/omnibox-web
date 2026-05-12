import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { showActionToast } from '@/components/sonner';
import useApp from '@/hooks/use-app';
import { Resource, ResourceType } from '@/interface';
import { getSmartFolderChildSidebarKey } from '@/page/sidebar/content/smart-folder-resource-utils';
import { useSidebarStore } from '@/page/sidebar/store';
import { fetchSmartFolderChildren } from '@/service/resource';

function extractResourceId(
  pathname: string,
  namespaceId: string
): string | undefined {
  const match = pathname.match(new RegExp(`^/${namespaceId}/([^/]+)`));
  return match?.[1];
}

async function refreshSmartFolderChildren(
  id: string,
  namespaceId: string,
  app: ReturnType<typeof useApp>
) {
  const store = useSidebarStore.getState();
  const parent = store.nodes[id];
  if (!parent || parent.resourceType !== 'smart_folder') {
    return;
  }

  try {
    const children = await fetchSmartFolderChildren(namespaceId, id);
    app.fire('smart_folder_children_updated', id, children);
    store.refreshChildren(
      id,
      children.map(child => ({
        ...child,
        id: getSmartFolderChildSidebarKey(id, child.id),
        parent_id: id,
        has_children: false,
        attrs: {
          ...(child.attrs || {}),
          __smart_folder_child: true,
          __source_resource_id: child.id,
          __source_parent_id: child.parent_id,
        },
      }))
    );
  } catch (err) {
    if ((err as { response?: { status?: number } }).response?.status === 404) {
      store.refreshChildren(id, []);
      store.collapse(id);
      app.fire('smart_folder_children_updated', id, []);
      return;
    }
    throw err;
  }
}

function getLoadedSmartFolderIds() {
  const store = useSidebarStore.getState();
  return Object.values(store.nodes)
    .filter(
      node =>
        node.resourceType === 'smart_folder' &&
        store.ui[node.id]?.loaded === true
    )
    .map(node => node.id);
}

function refreshLoadedSmartFolders(
  namespaceId: string,
  app: ReturnType<typeof useApp>
) {
  getLoadedSmartFolderIds().forEach(id => {
    refreshSmartFolderChildren(id, namespaceId, app).catch(err => {
      console.error('[sidebar] refresh smart folder failed:', err);
    });
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
            await useSidebarStore.getState().restore(res);
          }
          const last = resources[resources.length - 1];
          useSidebarStore.getState().activate(last.id);
          navigate(`/${namespaceId}/${last.id}`, {
            state: { fromSidebar: true },
          });
          refreshLoadedSmartFolders(namespaceId, app);
        }
      )
    );

    hooks.push(
      app.on(
        'delete_resource',
        (id: string, _parentId?: string, resourceType?: ResourceType) => {
          const deletedNode = useSidebarStore.getState().nodes[id];
          const isDeletedSmartFolder =
            resourceType === 'smart_folder' ||
            deletedNode?.resourceType === 'smart_folder';
          const smartFolderIdsToRefresh = getLoadedSmartFolderIds();
          const currentResourceId = extractResourceId(
            window.location.pathname,
            namespaceId
          );
          const result = useSidebarStore
            .getState()
            .remove(id, currentResourceId);

          if (result.nextId) {
            navigate(`/${namespaceId}/${result.nextId}`);
          } else if (result.navigateToChat) {
            navigate(`/${namespaceId}/chat`);
          }
          if (isDeletedSmartFolder) {
            app.fire('smart_folder_entitlements_refetch');
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
                  const nowResourceId = extractResourceId(
                    window.location.pathname,
                    currentNs
                  );
                  if (!nowResourceId || nowResourceId === id) {
                    navigate(`/${currentNs}/${restoredId}`);
                  }
                  refreshLoadedSmartFolders(currentNs, app);
                  if (isDeletedSmartFolder) {
                    app.fire('smart_folder_entitlements_refetch');
                  }
                })
                .catch(err => {
                  console.error('[sidebar] restore failed:', err);
                });
            },
          });
          smartFolderIdsToRefresh.forEach(smartFolderId => {
            refreshSmartFolderChildren(smartFolderId, namespaceId, app).catch(
              err => {
                console.error('[sidebar] refresh smart folder failed:', err);
              }
            );
          });
        }
      )
    );

    hooks.push(
      app.on('update_resource', (delta: Resource) => {
        useSidebarStore.getState().patch(delta.id, {
          name: delta.name,
          content: delta.content,
        });
        refreshLoadedSmartFolders(namespaceId, app);
      })
    );

    hooks.push(
      app.on('move_resource', async (id: string, parentId: string) => {
        await useSidebarStore.getState().move(id, parentId);
        refreshLoadedSmartFolders(namespaceId, app);
      })
    );

    hooks.push(
      app.on('scroll_to_resource', async (id: string, parentId?: string) => {
        const store = useSidebarStore.getState();
        if (parentId) {
          await store.expandPathTo(parentId, { expandTarget: true });
        }
        await store.expandPathTo(id, { expandTarget: true });
        store.activate(id);
        requestAnimationFrame(() => {
          document
            .querySelector(`[data-resource-id="${id}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      })
    );

    hooks.push(
      app.on('refresh_smart_folder_children', async (id: string) => {
        await refreshSmartFolderChildren(id, namespaceId, app);
      })
    );

    hooks.push(
      app.on('restore_resource', async (resource: Resource) => {
        const id = await useSidebarStore.getState().restore(resource);
        useSidebarStore.getState().activate(id);
        navigate(`/${namespaceId}/${id}`);
        refreshLoadedSmartFolders(namespaceId, app);
        if (resource.resource_type === 'smart_folder') {
          app.fire('smart_folder_entitlements_refetch');
        }
      })
    );

    return () => {
      hooks.forEach(unsub => unsub());
    };
  }, [namespaceId, navigate, t]);
}
