import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { showActionToast } from '@/components/sonner';
import useApp from '@/hooks/useApp';
import { Resource, ResourceType } from '@/interface';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import { withSmartFolderChildSidebarAttrs } from '@/page/sidebar/components/smart-folder';
import { useSidebarStore } from '@/page/sidebar/store';
import { getNodeResourceSort } from '@/page/sidebar/store/utils';
import {
  clearSidebarActiveKeyFromState,
  locateSidebarResource,
} from '@/page/sidebar/utils';
import {
  fetchChildren,
  fetchResource,
  fetchSmartFolderChildren,
} from '@/service/resource';

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
      children.map(child => withSmartFolderChildSidebarAttrs(child, id))
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
 * - update_resource (editor/resource-tasks -> sidebar)
 *
 * Sidebar-internal actions (expand, collapse, rename, scroll, etc.)
 * are called directly on the store by components.
 */
export function useSidebarEvents(namespaceId: string) {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

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
        await useSidebarStore.getState().restore(res);
      }
      const last = resources[resources.length - 1];
      useSidebarStore.getState().activate(last.id);
      navigateToResource(navigate, `/${namespaceId}/${last.id}`, {
        state: { fromSidebar: true },
      });
      refreshLoadedSmartFolders(namespaceId, app);
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
      const store = useSidebarStore.getState();
      const parentId = resource.parent_id || store.nodes[resource.id]?.parentId;
      if (parentId && store.nodes[parentId]?.resourceType !== 'smart_folder') {
        await handleRefreshResourceChildren(parentId);
      }
      refreshLoadedSmartFolders(namespaceId, app);
    };

    const handleRefreshResourceChildren = async (resourceId: string) => {
      const children = await fetchChildren(
        namespaceId,
        resourceId,
        getNodeResourceSort(useSidebarStore.getState(), resourceId)
      );
      useSidebarStore.getState().refreshChildren(resourceId, children);
    };

    const handleScrollToResource = async (
      targetId: string,
      parentId?: string
    ) => {
      if (parentId) {
        await handleRefreshResourceChildren(parentId);
      }
      await locateSidebarResource(targetId);

      // Smart-folder children keep selection via location.state.sidebarActiveKey.
      // Locate switches to the source resource, so clear that key or the old
      // smart-folder row stays highlighted after we scroll to the original path.
      const currentLocation = locationRef.current;
      const { changed, nextState } = clearSidebarActiveKeyFromState(
        currentLocation.state
      );
      if (changed) {
        navigate(
          {
            pathname: currentLocation.pathname,
            search: currentLocation.search,
            hash: currentLocation.hash,
          },
          {
            replace: true,
            state: nextState,
          }
        );
      }
    };

    // The event bus treats a listener return value as the next listener's
    // argument, so async handlers must not return Promise here.
    hooks.push(
      app.on(
        'generate_resource',
        (
          resourceIdOrParentId: string,
          resource?: Resource | Resource[],
          options?: GeneratedResourceOptions
        ) => {
          handleGeneratedResource(resourceIdOrParentId, resource, options);
        }
      )
    );
    hooks.push(
      app.on('refresh_resource_children', (resourceId: string) => {
        handleRefreshResourceChildren(resourceId);
      })
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
            navigateToResource(navigate, `/${namespaceId}/${result.nextId}`);
          } else if (result.navigateToChat) {
            navigate(`/${namespaceId}/chat`);
          }
          if (isDeletedSmartFolder) {
            useSidebarStore.getState().refetchSmartFolderEntitlements();
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
                    navigateToResource(navigate, `/${currentNs}/${restoredId}`);
                  } else {
                    handleScrollToResource(restoredId);
                  }
                  refreshLoadedSmartFolders(currentNs, app);
                  if (isDeletedSmartFolder) {
                    useSidebarStore.getState().refetchSmartFolderEntitlements();
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
      app.on('expand_resource', (resourceId: string) => {
        useSidebarStore
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
        handleScrollToResource(targetId, parentId);
      })
    );
    hooks.push(
      app.on('update_resource', (delta: Resource | string) => {
        handleUpdatedResource(delta);
      })
    );
    hooks.push(
      app.on('refresh_resource', (delta: Resource | string) => {
        handleUpdatedResource(delta);
      })
    );
    hooks.push(
      app.on('refresh_smart_folder_children', (id: string) => {
        refreshSmartFolderChildren(id, namespaceId, app);
      })
    );
    hooks.push(
      app.on('refresh_smart_folder_entitlements', () => {
        useSidebarStore.getState().refetchSmartFolderEntitlements();
      })
    );
    hooks.push(
      app.on('refresh_loaded_smart_folders', () => {
        refreshLoadedSmartFolders(namespaceId, app);
      })
    );

    hooks.push(
      app.on('restore_resource', (resource: Resource) => {
        (async () => {
          const id = await useSidebarStore.getState().restore(resource);
          useSidebarStore.getState().activate(id);
          navigateToResource(navigate, `/${namespaceId}/${id}`);
          refreshLoadedSmartFolders(namespaceId, app);
          if (resource.resource_type === 'smart_folder') {
            useSidebarStore.getState().refetchSmartFolderEntitlements();
          }
        })();
      })
    );

    return () => {
      hooks.forEach(unsub => unsub());
    };
  }, [app, namespaceId, navigate, t]);
}
