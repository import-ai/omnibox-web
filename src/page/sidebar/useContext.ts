import axios from 'axios';
import { orderBy } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useSidebar } from '@/components/ui/sidebar';
import useApp from '@/hooks/use-app';
import { IResourceData, Resource, ResourceType, SpaceType } from '@/interface';
import each from '@/lib/each';
import { http } from '@/lib/request';
import { uploadFiles } from '@/lib/upload-files';

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
  const [data, onData] = useState<{
    [index: string]: IResourceData;
  }>({});
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    spaceType: SpaceType;
    id: string;
    parentId: string;
    title: string;
  }>({
    open: false,
    spaceType: 'private',
    id: '',
    parentId: '',
    title: '',
  });
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
  const handleActiveKey = (id: string, edit?: boolean) => {
    if (edit) {
      navigate(`/${namespaceId}/${id}/edit`);
    } else {
      navigate(`/${namespaceId}/${id}`);
    }
    isMobile && setOpenMobile(false);
  };
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
      .get(`/namespaces/${namespaceId}/resources/${id}/children`)
      .then(response => {
        // Merge backend data and existing frontend data, remove duplicates
        const allChildren = [...response];
        existingChildren.forEach(existingChild => {
          const exists = response.find(
            (item: IResourceData) => item.id === existingChild.id
          );
          if (!exists) {
            // If backend doesn't return this resource but frontend has it (maybe just dragged in), keep frontend data
            allChildren.push(existingChild);
          }
        });

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
  const getResourceById = (
    spaceType: SpaceType,
    id: string
  ): Resource | null => {
    const children = data[spaceType]?.children;
    if (!children || children.length === 0) {
      return null;
    }
    return children.find(item => item.id === id) || null;
  };

  const handleDelete = (spaceType: SpaceType, id: string, parentId: string) => {
    const resource = getResourceById(spaceType, id);
    const title = resource?.name || t('resource.untitled');

    setDeleteDialog({
      open: true,
      spaceType,
      id,
      parentId,
      title,
    });
  };

  const handleDeleteSuccess = () => {
    const { spaceType, id, parentId } = deleteDialog;

    const routeToActive =
      id === resourceId ? getRouteToActive(spaceType, id, parentId) : '';
    data[spaceType].children = data[spaceType].children.filter(
      node => ![node.id, node.parent_id].includes(id)
    );

    // Update parent's has_children field
    const parentIndex = data[spaceType].children.findIndex(
      item => item.id === parentId
    );
    if (parentIndex >= 0) {
      const remainingChildren = data[spaceType].children.filter(
        item => item.parent_id === parentId
      );
      data[spaceType].children[parentIndex].has_children =
        remainingChildren.length > 0;
    }
    if (routeToActive) {
      navigate(`/${namespaceId}/${routeToActive}`);
    }
    onExpands(expands => expands.filter(expand => expand !== id));
    onData({ ...data });
  };

  const handleRestoreSuccess = (response: any) => {
    const { spaceType, parentId } = deleteDialog;
    activeRoute(spaceType, parentId, response);
  };
  const activeRoute = (
    spaceType: SpaceType,
    parentId: string,
    resource: Resource | Array<Resource>,
    edit?: boolean
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
    handleActiveKey(resources[resources.length - 1].id, edit);
  };
  const handleCreate = (
    spaceType: SpaceType,
    parentId: string,
    resourceType: ResourceType
  ) => {
    onEditingKey(parentId);
    http
      .post(`/namespaces/${namespaceId}/resources`, {
        parentId: parentId,
        namespaceId: namespaceId,
        resourceType: resourceType,
      })
      .then((response: Resource) => {
        activeRoute(spaceType, parentId, response, resourceType !== 'folder');
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
        if (parentIndex >= 0) {
          const remainingChildren = data[spaceType].children.filter(
            item => item.parent_id === parentId
          );
          data[spaceType].children[parentIndex].has_children =
            remainingChildren.length > 0;
        }

        onData({ ...data });
        if (routeToActive) {
          navigate(`/${namespaceId}/${routeToActive}`);
        }
      })
    );
    hooks.push(
      app.on('update_resource', (delta: Resource) => {
        each(data, (resource, key) => {
          if (
            Array.isArray(resource.children) &&
            resource.children.length > 0
          ) {
            const index = resource.children.findIndex(
              (node: Resource) => node.id === delta.id
            );
            if (index >= 0) {
              data[key].children[index].name = delta.name;
              data[key].children[index].content = delta.content;
              return true;
            }
          }
        });
        onData({ ...data });
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
        if (oldParentId) {
          if (oldParentId === data[resourceKey].id) {
            // Dragged from root, update root's has_children
            const remainingChildren = data[resourceKey].children.filter(
              item => item.parent_id === oldParentId && item.id !== resourceId
            );
            data[resourceKey].has_children = remainingChildren.length > 0;
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
        onExpands(expands => expands.filter(expand => expand !== resourceId));
        expandedRef.current = false;
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
  }, [data]);

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

  useEffect(() => {
    if (!namespaceId || !resourceId || Object.keys(data).length <= 0) {
      return;
    }
    const target = getResourceByField(resourceId);
    if (target) {
      if (target.has_children && !expands.includes(target.id)) {
        handleExpand(getSpaceType(target.id), target.id);
      }
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
            });
          });
      });
    return () => {
      source.cancel();
    };
  }, [namespaceId, resourceId, chatPage, data]);

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
    handleDrop,
    namespaceId,
    handleExpand,
    handleDelete,
    handleCreate,
    handleUpload,
    handleRename,
    deleteDialog,
    handleActiveKey,
    setDeleteDialog,
    handleDeleteSuccess,
    handleRestoreSuccess,
  };
}
