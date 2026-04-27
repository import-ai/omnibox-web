import axios from 'axios';
import { orderBy } from 'lodash-es';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { showActionToast } from '@/components/sonner';
import { useSidebar } from '@/components/ui/sidebar';
import useApp from '@/hooks/use-app';
import {
  IResourceData,
  PathItem,
  Resource,
  ResourceType,
  SpaceType,
} from '@/interface';
import { deleteResource } from '@/lib/delete-resource';
import each from '@/lib/each';
import { http } from '@/lib/request';
import { uploadFiles } from '@/lib/upload-files';

import {
  CreateSmartFolderPayload,
  SmartFolderResponse,
} from './content/smart-folder-types';

export default function useContext() {
  const app = useApp();
  const loc = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const expandedRef = useRef(false);
  const [progress, setProgress] = useState('');
  const { isMobile, setOpenMobile } = useSidebar();
  const chatPage = loc.pathname.includes('/chat');
  const resourceId = params.resource_id || '';
  const namespaceId = params.namespace_id || '';
  const [expanding, onExpanding] = useState('');
  const [editingKey, onEditingKey] = useState('');
  const [expands, onExpands] = useState<Array<string>>([]);
  const [visibleResourceId, setVisibleResourceId] = useState<string>('');
  const [openSpaces, setOpenSpaces] = useState<Record<string, boolean>>({});
  const sidebarActiveKey =
    typeof loc.state?.sidebarActiveKey === 'string'
      ? loc.state.sidebarActiveKey
      : '';
  const scrollFrameRef = useRef<number | null>(null);
  const scrollTaskIdRef = useRef(0);
  const [data, onData] = useState<{
    [index: string]: IResourceData;
  }>({});

  const scrollToResource = (
    resourceId: string,
    force: boolean = false
  ): boolean => {
    if (!force && visibleResourceId === resourceId) {
      return true;
    }
    setVisibleResourceId(resourceId);

    const isFromSidebar = loc.state?.fromSidebar === true;
    if (!force && isFromSidebar) {
      navigate(loc.pathname, {
        replace: true,
        state: { ...loc.state, fromSidebar: undefined },
      });
      return true;
    }

    const element = document.querySelector(
      `[data-resource-id="${resourceId}"]`
    );
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return true;
    }
    return false;
  };

  const scheduleScrollToResource = (
    id: string,
    force: boolean = false,
    attempts: number = 8
  ) => {
    scrollTaskIdRef.current += 1;
    const taskId = scrollTaskIdRef.current;
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }
    const run = (remainingAttempts: number) => {
      if (taskId !== scrollTaskIdRef.current) {
        return;
      }
      scrollFrameRef.current = requestAnimationFrame(() => {
        if (taskId !== scrollTaskIdRef.current) {
          return;
        }
        const didScroll = scrollToResource(id, force);
        if (!didScroll && remainingAttempts > 0) {
          run(remainingAttempts - 1);
          return;
        }
        scrollFrameRef.current = null;
      });
    };
    run(attempts);
  };

  const cancelPendingScroll = () => {
    scrollTaskIdRef.current += 1;
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
  };

  const getSpaceType = (id: string): SpaceType => {
    let spaceType: SpaceType = 'private';
    each(data, (resource, key) => {
      if (resource.id === id) {
        spaceType = key;
        return true;
      }
      if (Array.isArray(resource.children) && resource.children.length > 0) {
        const index = resource.children.findIndex(
          (node: Resource) => node.id === id
        );
        if (index >= 0) {
          spaceType = key;
          return true;
        }
      }
    });
    return spaceType;
  };

  const getResourceByField = (
    id: string,
    field: string = 'id'
  ): Resource | null => {
    let current: Resource | null = null;
    each(data, item => {
      if (item[field] === id) {
        current = item;
        return true;
      }
      if (Array.isArray(item.children) && item.children.length > 0) {
        const target = item.children.find(
          (node: Resource) => (node as any)[field] === id
        );
        if (target) {
          current = target;
          return true;
        }
      }
    });
    return current;
  };

  const handleActiveKey = (
    id: string,
    edit?: boolean,
    sidebarActiveKey?: string
  ) => {
    const state = { fromSidebar: true, sidebarActiveKey };
    if (edit) {
      navigate(`/${namespaceId}/${id}/edit`, { state });
    } else {
      navigate(`/${namespaceId}/${id}`, { state });
    }
    isMobile && setOpenMobile(false);
  };

  const handleSpaceToggle = useCallback((spaceType: string, open?: boolean) => {
    setOpenSpaces(prev => ({
      ...prev,
      [spaceType]:
        open !== undefined ? open : prev[spaceType] !== false ? false : true,
    }));
  }, []);

  const isSmartFolder = (id: string) =>
    getResourceByField(id)?.resource_type === 'smart_folder';

  const getChildrenApiPath = (id: string) =>
    isSmartFolder(id)
      ? `/namespaces/${namespaceId}/smart-folders/${id}/children`
      : `/namespaces/${namespaceId}/resources/${id}/children`;

  const normalizeChildrenForParent = (
    parentId: string,
    children: IResourceData[]
  ): IResourceData[] =>
    isSmartFolder(parentId)
      ? children.map(child => ({
          ...child,
          id: `smart-folder-child-${parentId}-${child.id}`,
          parent_id: parentId,
          attrs: {
            ...(child.attrs || {}),
            __smart_folder_child: true,
            __source_resource_id: child.id,
            __source_parent_id: child.parent_id,
          },
          has_children: false,
          children: [],
        }))
      : children;

  const handleExpand = (spaceType: SpaceType, id: string) => {
    if (expandedRef.current || expanding) {
      return;
    }

    // If collapsing, update expand state directly
    if (expands.includes(id)) {
      onExpands(expands.filter(item => item !== id));
      return;
    }

    // Always fetch latest data from backend to ensure resources dragged in are displayed correctly
    onExpanding(id);

    // Save current child data (may contain newly dragged-in resources)
    const existingChildren = data[spaceType].children.filter(
      item => item.parent_id === id
    );

    // Remove existing child data for this node
    data[spaceType].children = data[spaceType].children.filter(
      item => item.parent_id !== id
    );
    http
      .get(getChildrenApiPath(id))
      .then(response => {
        // Merge backend data and existing frontend data, remove duplicates
        const allChildren = normalizeChildrenForParent(id, [...response]);
        if (!isSmartFolder(id)) {
          existingChildren.forEach(existingChild => {
            const exists = response.find(
              (item: IResourceData) => item.id === existingChild.id
            );
            if (!exists) {
              // If backend doesn't return this resource but frontend has it (maybe just dragged in), keep frontend data
              allChildren.push(existingChild);
            }
          });
        }

        each(allChildren, item => {
          data[spaceType].children.push(item);
        });
        onData({ ...data });
        expands.push(id);
        onExpands([...expands]);
      })
      .finally(() => {
        onExpanding('');
      });
  };
  const getRouteToActive = (
    spaceType: SpaceType,
    id: string,
    parentId: string
  ) => {
    let activeKey = 'chat';
    const items = data[spaceType].children.filter(
      node => node.parent_id === parentId
    );
    if (items.length > 0) {
      const itemsOrder = orderBy(items, ['updated_at'], ['desc']);
      const index = itemsOrder.findIndex((node: Resource) => node.id === id);
      if (index > 0) {
        activeKey = itemsOrder[index - 1].id;
      } else {
        const next = itemsOrder[index + 1];
        if (next) {
          activeKey = next.id;
        }
      }
    }
    if (id !== resourceId) {
      const parentIndex = data[spaceType].children.findIndex(
        node => node.id === parentId
      );
      if (parentIndex >= 0) {
        activeKey = '';
      }
    }
    return activeKey;
  };

  const handleDelete = (spaceType: SpaceType, id: string, parentId: string) => {
    if (!spaceType) {
      return;
    }
    deleteResource({ id, parentId, namespaceId, app });
  };

  const activeRoute = (
    spaceType: SpaceType,
    parentId: string,
    resource: Resource | Array<Resource>,
    edit?: boolean,
    scrollToTarget?: boolean
  ) => {
    const resources = Array.isArray(resource) ? resource : [resource];
    resources.forEach(item => {
      if (!data[spaceType]) {
        data[spaceType] = {
          ...item,
          children: [],
          has_children: false,
        };
      } else {
        if (!Array.isArray(data[spaceType].children)) {
          data[spaceType].children = [
            {
              ...item,
              children: [],
              has_children: false,
            },
          ];
        } else {
          const index = data[spaceType].children.findIndex(
            item => item.id === parentId
          );
          if (index >= 0) {
            data[spaceType].children[index].has_children = true;
          }
          data[spaceType].children.push({
            ...item,
            children: [],
          });
        }
      }
    });
    onData({ ...data });
    if (!expands.includes(parentId)) {
      onExpands([...expands, parentId]);
    }
    const targetResourceId = resources[resources.length - 1].id;
    if (scrollToTarget) {
      navigate(`/${namespaceId}/${targetResourceId}${edit ? '/edit' : ''}`);
      isMobile && setOpenMobile(false);
    } else {
      handleActiveKey(targetResourceId, edit);
    }
  };
  const handleCreate = (
    spaceType: SpaceType,
    parentId: string,
    resourceType: ResourceType,
    initialName?: string
  ) => {
    onEditingKey(parentId);
    const payload: {
      parentId: string;
      namespaceId: string;
      resourceType: ResourceType;
      name?: string;
    } = {
      parentId: parentId,
      namespaceId: namespaceId,
      resourceType: resourceType,
    };
    // If an initial name is provided, include it in the creation request
    if (initialName && initialName.trim()) {
      payload.name = initialName.trim();
    }
    return http
      .post(`/namespaces/${namespaceId}/resources`, payload)
      .then((response: Resource) => {
        activeRoute(spaceType, parentId, response, resourceType !== 'folder');
      })
      .finally(() => {
        onEditingKey('');
      });
  };
  const handleCreateSmartFolder = (
    spaceType: SpaceType,
    parentId: string,
    payload: CreateSmartFolderPayload
  ) => {
    onEditingKey(parentId);
    return http
      .post(`/namespaces/${namespaceId}/smart-folders`, {
        ...payload,
        parentId,
        rootScope: spaceType,
      })
      .then((response: SmartFolderResponse) => {
        activeRoute(spaceType, parentId, response.resource, false);
        toast.success(t('smart_folder.create.success'));
      })
      .finally(() => {
        onEditingKey('');
      });
  };

  const handleUpload = (
    spaceType: SpaceType,
    parentId: string,
    files: FileList
  ) => {
    onEditingKey(parentId);
    return uploadFiles(files, {
      parentId: parentId,
      namespaceId: namespaceId,
      onProgress: ({ done, total }) => {
        setProgress(`${done}/${total}`);
      },
    })
      .then(response => {
        activeRoute(spaceType, parentId, response);
        toast.success(t('upload.success', { count: files.length }));
      })
      .catch(err => {
        toast(err && err.message ? err.message : err, {
          position: 'bottom-right',
        });
      })
      .finally(() => {
        onEditingKey('');
        setProgress('');
      });
  };
  const handleDrop = (drag: IResourceData, drop: IResourceData | null) => {
    if (!drag || !drop) {
      return;
    }
    http
      .post(`/namespaces/${namespaceId}/resources/${drag.id}/move/${drop.id}`)
      .then(() => {
        app.fire('move_resource', drag.id, drop.id);
      });
  };

  const handleRename = async (id: string, newName: string) => {
    const response = await http.patch(
      `/namespaces/${namespaceId}/resources/${id}`,
      { name: newName, namespaceId }
    );
    app.fire('update_resource', response);
  };

  // Collect parent IDs from target upwards
  const collectParentKeys = (target: Resource): string[] => {
    const keys: string[] = [];
    for (
      let current: string | undefined = target.parent_id;
      current;
      current = getResourceByField(current)?.parent_id
    ) {
      keys.push(current);
    }
    return keys;
  };

  // Batch add expand keys (deduplicated), uses functional update to avoid stale closure
  const addExpandKeys = (ids: string[]) => {
    onExpands(prev => {
      let changed = false;
      const next = [...prev];
      each(ids, id => {
        if (id && !next.includes(id)) {
          next.push(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  // Batch upsert nodes into the specified space (deduplicated)
  const upsertNodes = (spaceType: SpaceType, list: Resource[]) => {
    let changed = false;
    each(list, node => {
      const exists = data[spaceType].children.find(
        child => child.id === node.id
      );
      if (!exists) {
        data[spaceType].children.push(node);
        changed = true;
      }
    });
    if (changed) {
      onData({ ...data });
    }
  };

  // Resolve spaceType from the first node of a path
  const resolveSpaceTypeByPath = (path: PathItem[]): SpaceType => {
    return (
      ((Object.keys(data) as SpaceType[]).find(
        key => data[key].id === path[0].id
      ) as SpaceType) || getSpaceType(path[0].id)
    );
  };

  // Load children of a folder and expand it
  const loadChildren = (spaceType: SpaceType, id: string) => {
    onExpanding(id);
    return http
      .get(getChildrenApiPath(id))
      .then(response => {
        data[spaceType].children = data[spaceType].children.filter(
          item => item.parent_id !== id
        );
        data[spaceType].children.push(
          ...normalizeChildrenForParent(id, response)
        );
        addExpandKeys([id]);
        onData({ ...data });
      })
      .finally(() => {
        onExpanding('');
      });
  };

  const refreshSmartFolderChildren = (resourceId: string) => {
    const target = getResourceByField(resourceId);
    if (!target || target.resource_type !== 'smart_folder') {
      return;
    }
    const spaceType = getSpaceType(resourceId);
    loadChildren(spaceType, resourceId);
  };

  useEffect(() => {
    const hooks: Array<() => void> = [];
    hooks.push(
      app.on(
        'generate_resource',
        (parentId: string, resource: Resource | Array<Resource>) => {
          const resources = Array.isArray(resource) ? resource : [resource];
          if (
            resources.length <= 0 ||
            !Array.isArray(resources[0].path) ||
            resources[0].path.length <= 0
          ) {
            return;
          }
          const spaceType = getSpaceType(resources[0].path[0].id);
          activeRoute(spaceType, parentId, resource);
        }
      )
    );
    hooks.push(
      app.on('delete_resource', (id: string, parentId: string) => {
        const spaceType = getSpaceType(id);
        const routeToActive =
          id === resourceId ? getRouteToActive(spaceType, id, parentId) : '';
        data[spaceType].children = data[spaceType].children.filter(
          node => ![node.id, node.parent_id].includes(id)
        );

        // Update parent's has_children field
        const parentIndex = data[spaceType].children.findIndex(
          item => item.id === parentId
        );
        let parentBecameEmpty = false;
        if (parentIndex >= 0) {
          const remainingChildren = data[spaceType].children.filter(
            item => item.parent_id === parentId
          );
          data[spaceType].children[parentIndex].has_children =
            remainingChildren.length > 0;
          parentBecameEmpty = remainingChildren.length === 0;
        }

        onData({ ...data });

        if (parentBecameEmpty) {
          onExpands(expands => expands.filter(expand => expand !== parentId));
        }

        if (routeToActive) {
          navigate(`/${namespaceId}/${routeToActive}`);
        }

        // Show toast notification for all delete operations
        showActionToast(t('resource.moved_to_trash'), {
          actionLabel: t('undo'),
          onAction: () => {
            http
              .post(`/namespaces/${namespaceId}/resources/${id}/restore`)
              .then(response => {
                activeRoute(spaceType, parentId, response);
                app.fire('trash_updated');
              });
          },
        });
      })
    );
    hooks.push(
      app.on('update_resource', (delta: Resource) => {
        let updated = false;
        const smartFolderParentIds = new Set<string>();
        const newData = { ...data };
        each(data, (resource, key) => {
          // 1. Check if it's the root resource itself
          if (resource.id === delta.id) {
            newData[key] = {
              ...resource,
              name: delta.name,
              content: delta.content,
            };
            updated = true;
            return true;
          }
          // 2. Check if it's in children
          if (
            Array.isArray(resource.children) &&
            resource.children.length > 0
          ) {
            let childrenUpdated = false;
            const nextChildren = resource.children.map((child: Resource) => {
              const isSourceResource =
                child.id === delta.id ||
                child.attrs?.__source_resource_id === delta.id;
              if (!isSourceResource) {
                return child;
              }
              if (child.attrs?.__smart_folder_child === true) {
                smartFolderParentIds.add(child.parent_id);
              }
              childrenUpdated = true;
              updated = true;
              return { ...child, name: delta.name, content: delta.content };
            });
            if (childrenUpdated) {
              newData[key] = {
                ...resource,
                children: nextChildren,
              };
            }
          }
        });
        if (updated) {
          onData(newData);
        }
        smartFolderParentIds.forEach(refreshSmartFolderChildren);
      })
    );
    hooks.push(
      app.on('refresh_smart_folder_children', refreshSmartFolderChildren)
    );
    hooks.push(
      app.on('refresh_resource', (resourceId: string) => {
        http
          .get(`/namespaces/${namespaceId}/resources/${resourceId}`)
          .then((response: Resource) => {
            let updated = false;
            const newData = { ...data };
            each(data, (resource, key) => {
              if (
                Array.isArray(resource.children) &&
                resource.children.length > 0
              ) {
                const index = resource.children.findIndex(
                  (node: Resource) => node.id === resourceId
                );
                if (index >= 0) {
                  newData[key] = {
                    ...resource,
                    children: resource.children.map(
                      (child: Resource, i: number) =>
                        i === index
                          ? {
                              ...child,
                              name: response.name,
                              has_children: response.has_children,
                            }
                          : child
                    ),
                  };
                  updated = true;
                  return true;
                }
              }
            });
            if (updated) {
              onData(newData);
            }
          });
      })
    );
    hooks.push(
      app.on('expand_resource', (resourceId: string) => {
        const target = getResourceByField(resourceId);
        if (target) {
          addExpandKeys(collectParentKeys(target));
          const spaceType = getSpaceType(resourceId);
          if (!spaceType || !data[spaceType]) return;
          loadChildren(spaceType, resourceId);
          return;
        }

        // target not in local state → fetch from API → load missing nodes → expand
        http
          .get(`/namespaces/${namespaceId}/resources/${resourceId}`, {
            mute: true,
          })
          .then((resource: Resource) => {
            if (
              !resource ||
              !Array.isArray(resource.path) ||
              resource.path.length <= 0
            )
              return;
            const path = resource.path;
            const spaceType = resolveSpaceTypeByPath(path);
            if (!spaceType || !data[spaceType]) return;

            const missingIds: string[] = [];
            each(path, item => {
              if (!getResourceByField(item.id)) missingIds.push(item.id);
            });
            if (
              !getResourceByField(resourceId) &&
              !missingIds.includes(resourceId)
            ) {
              missingIds.push(resourceId);
            }

            const fetchMissing =
              missingIds.length > 0
                ? http.get(
                    `/namespaces/${namespaceId}/resources?id=${missingIds.join(',')}`
                  )
                : Promise.resolve([]);

            fetchMissing.then(response => {
              const resources = Array.isArray(response)
                ? (response as Resource[])
                : [];
              upsertNodes(spaceType, resources);
              addExpandKeys(path.slice(0, -1).map((item: PathItem) => item.id));
              loadChildren(spaceType, resourceId);
            });
          });
      })
    );
    hooks.push(
      app.on('collapse_resource', (resourceId: string) => {
        // Collect the target and all its descendants
        const toRemove = new Set<string>([resourceId]);
        let found = true;
        while (found) {
          found = false;
          each(data, spaceData => {
            if (Array.isArray(spaceData.children)) {
              each(spaceData.children, (child: Resource) => {
                if (toRemove.has(child.parent_id) && !toRemove.has(child.id)) {
                  toRemove.add(child.id);
                  found = true;
                }
              });
            }
          });
        }
        onExpands(prev => prev.filter(item => !toRemove.has(item)));
      })
    );
    hooks.push(
      app.on('restore_resource', (resource: Resource) => {
        if (
          !resource ||
          !Array.isArray(resource.path) ||
          resource.path.length <= 0
        ) {
          return;
        }
        const spaceType = getSpaceType(resource.path[0].id);
        // Expand the corresponding space (individual/team)
        handleSpaceToggle(spaceType, true);
        activeRoute(spaceType, resource.parent_id, resource, false, true);
      })
    );
    hooks.push(
      app.on('move_resource', (resourceId: string, targetId: string) => {
        let resourceIndex = -1;
        let targetKey: SpaceType | '' = '';
        let resourceKey: SpaceType | '' = '';
        let oldParentId = '';
        each(data, (items, key) => {
          if (Array.isArray(items.children) && items.children.length > 0) {
            const maybeResourceIndex = items.children.findIndex(
              (node: Resource) => node.id === resourceId
            );
            if (maybeResourceIndex >= 0) {
              resourceKey = key;
              resourceIndex = maybeResourceIndex;
              oldParentId = items.children[maybeResourceIndex].parent_id;
            }
            const maybeTargetIndex = items.children.findIndex(
              (node: Resource) => node.id === targetId
            );
            if (maybeTargetIndex >= 0) {
              targetKey = key;
            }
          }
          if (!targetKey && items.id === targetId) {
            targetKey = key;
          }
        });
        if (!targetKey || !resourceKey || resourceIndex < 0) {
          return;
        }
        const resourceChildrenIdToRemove: Array<string> = [];
        each(data[resourceKey].children, item => {
          if (
            item.parent_id === resourceId ||
            resourceChildrenIdToRemove.includes(item.parent_id)
          ) {
            resourceChildrenIdToRemove.push(item.id);
          }
        });
        if (resourceChildrenIdToRemove.length > 0) {
          data[resourceKey].children = data[resourceKey].children.filter(
            item => !resourceChildrenIdToRemove.includes(item.id)
          );
        }
        if (targetKey === resourceKey) {
          // Move within the same space
          data[resourceKey].children[resourceIndex].parent_id = targetId;
        } else {
          // Move across spaces
          const resources = data[resourceKey].children.splice(resourceIndex, 1);
          resources[0].parent_id = targetId;

          // Ensure resource is displayed in target space
          if (!data[targetKey].children) {
            data[targetKey].children = [];
          }
          data[targetKey].children.push(resources[0]);
        }

        // Update original parent's has_children field
        let parentBecameEmpty = false;
        if (oldParentId) {
          if (oldParentId === data[resourceKey].id) {
            // Dragged from root, update root's has_children
            const remainingChildren = data[resourceKey].children.filter(
              item => item.parent_id === oldParentId && item.id !== resourceId
            );
            data[resourceKey].has_children = remainingChildren.length > 0;
            parentBecameEmpty = remainingChildren.length === 0;
          } else {
            // Dragged from subfolder, update subfolder's has_children
            const oldParentIndex = data[resourceKey].children.findIndex(
              item => item.id === oldParentId
            );
            if (oldParentIndex >= 0) {
              const remainingChildren = data[resourceKey].children.filter(
                item => item.parent_id === oldParentId && item.id !== resourceId
              );
              data[resourceKey].children[oldParentIndex].has_children =
                remainingChildren.length > 0;
              parentBecameEmpty = remainingChildren.length === 0;
            }
          }
        }

        // Update target parent's has_children field
        if (targetId === data[targetKey].id) {
          // Dragged to root, update root's has_children
          data[targetKey].has_children = true;
        } else {
          // Dragged to subfolder, update subfolder's has_children
          const targetParentIndex = data[targetKey].children.findIndex(
            item => item.id === targetId
          );
          if (targetParentIndex >= 0) {
            data[targetKey].children[targetParentIndex].has_children = true;
          }
        }
        onData({ ...data });
        onExpands(expands =>
          expands.filter(
            expand =>
              expand !== resourceId &&
              !(parentBecameEmpty && expand === oldParentId)
          )
        );
        expandedRef.current = false;
      })
    );
    hooks.push(
      app.on('refresh_resource_children', (parentId: string) => {
        const syncParentHasChildrenInFlat = (
          root: IResourceData,
          id: string,
          directChildCount: number
        ) => {
          const hasChildren = directChildCount > 0;
          if (root.id === id) {
            root.has_children = hasChildren;
            return;
          }
          const idx = root.children.findIndex(item => item.id === id);
          if (idx >= 0) {
            root.children[idx].has_children = hasChildren;
          }
        };

        const mergeChildrenAndRefresh = (
          spaceType: SpaceType,
          response: unknown
        ) => {
          const list = Array.isArray(response) ? response : [];
          const root = data[spaceType];
          root.children = root.children.filter(
            item => item.parent_id !== parentId
          );
          root.children.push(...list);
          syncParentHasChildrenInFlat(root, parentId, list.length);
          onData({ ...data });
        };

        const target = getResourceByField(parentId);
        if (target) {
          const spaceType = getSpaceType(parentId);
          http
            .get(`/namespaces/${namespaceId}/resources/${parentId}/children`)
            .then(response => mergeChildrenAndRefresh(spaceType, response));
          return;
        }
        http
          .get(`/namespaces/${namespaceId}/resources/${parentId}`, {
            mute: true,
          })
          .then(resource => {
            if (!resource) return;
            const path = resource.path;
            if (!Array.isArray(path) || path.length <= 0) return;
            const resolvedSpaceType = getSpaceType(path[0].id);
            if (!resolvedSpaceType || !data[resolvedSpaceType]) return;

            const parentExists = data[resolvedSpaceType].children.some(
              item => item.id === parentId
            );
            if (!parentExists) {
              data[resolvedSpaceType].children.push(resource);
            }

            http
              .get(`/namespaces/${namespaceId}/resources/${parentId}/children`)
              .then(response =>
                mergeChildrenAndRefresh(resolvedSpaceType, response)
              );
          });
      })
    );
    hooks.push(
      app.on('scroll_to_resource', (targetId: string, parentId?: string) => {
        cancelPendingScroll();
        const finalizeScroll = (id: string) => {
          navigate(`/${namespaceId}/${id}`, {
            replace: true,
            state: { fromSidebar: undefined },
          });
          scheduleScrollToResource(id, true);
        };

        if (parentId) {
          const parent = getResourceByField(parentId);
          if (parent) {
            const spaceType = getSpaceType(parentId);
            handleSpaceToggle(spaceType, true);
            addExpandKeys([...collectParentKeys(parent), parentId]);
            loadChildren(spaceType, parentId).finally(() => {
              finalizeScroll(targetId);
            });
            return;
          }
        }

        const target = getResourceByField(targetId);
        if (target) {
          const spaceType = getSpaceType(targetId);
          handleSpaceToggle(spaceType, true);
          addExpandKeys(collectParentKeys(target));
          finalizeScroll(targetId);
          return;
        }

        http
          .get(`/namespaces/${namespaceId}/resources/${targetId}`, {
            mute: true,
          })
          .then((resource: Resource) => {
            if (!resource) return;
            const path = Array.isArray(resource.path) ? resource.path : [];
            const spaceType =
              path.length > 0
                ? resolveSpaceTypeByPath(path)
                : getSpaceType(resource.id);
            if (!spaceType || !data[spaceType]) {
              finalizeScroll(targetId);
              return;
            }
            handleSpaceToggle(spaceType, true);

            const missingIds: string[] = [];
            each(path, item => {
              if (!getResourceByField(item.id)) missingIds.push(item.id);
            });
            if (
              !getResourceByField(targetId) &&
              !missingIds.includes(targetId)
            ) {
              missingIds.push(targetId);
            }

            const fetchMissing =
              missingIds.length > 0
                ? http.get(
                    `/namespaces/${namespaceId}/resources?id=${missingIds.join(',')}`
                  )
                : Promise.resolve([]);

            fetchMissing.then(response => {
              const resources = Array.isArray(response)
                ? (response as Resource[])
                : [];
              upsertNodes(spaceType, resources);

              // Collect expand keys (prefer parent chain, fallback to path)
              const targetNode = getResourceByField(targetId) || resource;
              let parentIds = collectParentKeys(targetNode);
              if (parentIds.length <= 0) {
                parentIds = path.map(item => item.id);
                if (
                  targetNode.parent_id &&
                  !parentIds.includes(targetNode.parent_id)
                ) {
                  parentIds.push(targetNode.parent_id);
                }
              }
              addExpandKeys(parentIds);
              finalizeScroll(targetId);
            });
          })
          .catch(() => {
            if (!parentId) return;
            const spaceType = getSpaceType(parentId);
            if (!spaceType || !data[spaceType]) return;
            handleSpaceToggle(spaceType, true);
            http
              .get(`/namespaces/${namespaceId}/resources/${parentId}/children`)
              .then(response => {
                data[spaceType].children = data[spaceType].children.filter(
                  item => item.parent_id !== parentId
                );
                data[spaceType].children.push(...response);
                addExpandKeys([parentId]);
                onData({ ...data });
                finalizeScroll(targetId);
              });
          });
      })
    );
    hooks.push(
      app.on('clean_resource', () => {
        each(data, (_resource, key) => {
          data[key].children = [];
        });
        onData({ ...data });
      })
    );
    return () => {
      each(hooks, destroy => {
        destroy();
      });
    };
  }, [data, resourceId]);

  useEffect(() => {
    return app.on('move_resource_start', () => {
      expandedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (resourceId || chatPage) {
      return;
    }
    let node: any = null;
    each(data, resource => {
      if (Array.isArray(resource.children) && resource.children.length > 0) {
        node = resource.children[0];
        return true;
      }
      return;
    });
    if (node && node.id) {
      navigate(`/${namespaceId}/${node.id}`);
    }
  }, [chatPage, namespaceId, resourceId, data]);

  const [autoExpandedKeys, setAutoExpandedKeys] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!namespaceId || !resourceId || Object.keys(data).length <= 0) {
      return;
    }

    const treeTargetId = sidebarActiveKey || resourceId;
    const autoExpandKey = `${namespaceId}:${treeTargetId}`;
    if (autoExpandedKeys[autoExpandKey]) {
      return;
    }

    const target = getResourceByField(treeTargetId);
    if (target) {
      if (target.has_children && !expands.includes(target.id)) {
        handleExpand(getSpaceType(target.id), target.id);
      }
      for (
        let current: string | undefined = target.parent_id;
        current;
        current = getResourceByField(current)?.parent_id
      ) {
        if (!expands.includes(current)) {
          expands.push(current);
        }
      }

      onExpands([...expands]);
      setAutoExpandedKeys(prev => ({
        ...prev,
        [autoExpandKey]: true,
      }));
      scheduleScrollToResource(treeTargetId);
      return;
    }
    if (sidebarActiveKey && sidebarActiveKey !== resourceId) {
      return;
    }
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/resources/${resourceId}`, {
        mute: true,
        cancelToken: source.token,
      })
      .then(resource => {
        if (!resource) {
          return;
        }
        const path = resource.path;
        if (!Array.isArray(path) || path.length <= 0) {
          return;
        }
        const resourceIdsToLoad: Array<string> = [];
        each(path, item => {
          if (getResourceByField(item.id)) {
            return;
          }
          resourceIdsToLoad.push(item.id);
        });
        if (resourceIdsToLoad.length <= 0) {
          return;
        }
        const spaceType = getSpaceType(path[0].id);
        http
          .get(
            `/namespaces/${namespaceId}/resources?id=${resourceIdsToLoad.join(',')}`,
            {
              cancelToken: source.token,
            }
          )
          .then(response => {
            each(response, item => {
              data[spaceType].children.push(item);
            });
            onData({ ...data });
            const size = path.length - 1;
            each(path, (item, index) => {
              if (index >= size) {
                return;
              }
              if (!expands.includes(item.id)) {
                expands.push(item.id);
              }
            });
            onExpands([...expands]);
            setAutoExpandedKeys(prev => ({
              ...prev,
              [autoExpandKey]: true,
            }));
            const treeToExpand: Array<string> = [];
            const index = path.findIndex(
              item => item.id === resourceIdsToLoad[0]
            );
            treeToExpand.push(path[index - 1].id);
            const resourceIdsToLoadSize = resourceIdsToLoad.length - 1;
            each(resourceIdsToLoad, (resourceIdToLoad, index) => {
              if (index >= resourceIdsToLoadSize) {
                return;
              }
              treeToExpand.push(resourceIdToLoad);
            });
            Promise.all(
              treeToExpand.map(itemToExpand =>
                http.get(
                  `/namespaces/${namespaceId}/resources/${itemToExpand}/children`
                )
              )
            ).then(response => {
              each(response, items => {
                each(items, item => {
                  const exist = data[spaceType].children.find(
                    children => children.id === item.id
                  );
                  if (!exist) {
                    data[spaceType].children.push(item);
                  }
                });
              });
              onData({ ...data });
              // Scroll after all parent folders loaded
              scheduleScrollToResource(treeTargetId);
            });
          });
      });
    return () => {
      source.cancel();
    };
  }, [
    namespaceId,
    resourceId,
    sidebarActiveKey,
    chatPage,
    data,
    autoExpandedKeys,
  ]);

  useEffect(() => {
    if (!localStorage.getItem('uid')) {
      return;
    }
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/root`, {
        cancelToken: source.token,
      })
      .then(items => {
        const state: {
          [index: string]: IResourceData;
        } = {};
        Object.keys(items).forEach(key => {
          state[key] = {
            has_children: true,
            ...items[key],
          };
        });
        onData(state);
      })
      .finally(() => {
        onExpands([]);
      });
    return () => {
      source.cancel();
    };
  }, [namespaceId]);

  return {
    data,
    expands,
    progress,
    chatPage,
    expanding,
    editingKey,
    resourceId,
    openSpaces,
    handleDrop,
    namespaceId,
    handleExpand,
    handleDelete,
    handleCreate,
    handleCreateSmartFolder,
    handleUpload,
    handleRename,
    handleActiveKey,
    handleSpaceToggle,
  };
}
