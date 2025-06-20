import each from '@/lib/each';
import { toast } from 'sonner';
import { orderBy } from 'lodash-es';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '@/components/ui/sidebar';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { IResourceData, Resource, ResourceType, SpaceType } from '@/interface';

const spaceTypes = ['private', 'teamspace'];

interface IData {
  [index: string]: IResourceData;
}

export default function useContext() {
  const app = useApp();
  const params = useParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const handleActiveKey = (id: string) => {
    navigate(`/${namespaceId}/${id}`);
    isMobile && setOpenMobile(false);
  };
  const handleExpand = (id: string, spaceType: SpaceType) => {
    let match = false;
    each(data, (resource) => {
      if (Array.isArray(resource.children) && resource.children.length > 0) {
        const target = resource.children.find(
          (node: Resource) => node.parent_id === id,
        );
        if (target) {
          match = true;
          return match;
        }
      }
    });
    if (match) {
      if (expands.includes(id)) {
        onExpands(expands.filter((item) => item !== id));
      } else {
        expands.push(id);
        onExpands([...expands]);
      }
      return;
    }
    onExpanding(id);
    http
      .get(`/namespaces/${namespaceId}/resources/query`, {
        params: {
          namespace: namespaceId,
          spaceType: spaceType,
          parentId: id,
        },
      })
      .then((response) => {
        if (response.length <= 0) {
          data[spaceType].children.push({
            id: 'empty',
            name: '',
            parent_id: id,
            children: [],
            resource_type: 'file',
            space_type: 'private',
            namespace: { id: namespaceId },
          });
        } else {
          each(response, (item) => {
            data[spaceType].children.push(item);
          });
        }
        onData({ ...data });
        expands.push(id);
        onExpands([...expands]);
        onExpanding('');
      })
      .catch(() => {
        onExpanding('');
      });
  };
  const handleMenuMore = (id: string, spaceType: SpaceType) => {
    let match = false;
    each(data, (resource) => {
      if (Array.isArray(resource.children) && resource.children.length > 0) {
        const target = resource.children.find(
          (node: Resource) => node.parent_id === id,
        );
        if (target) {
          match = true;
          return match;
        }
      }
    });
    if (match) {
      return;
    }
    http
      .get(`/namespaces/${namespaceId}/resources/query`, {
        params: {
          namespace: namespaceId,
          spaceType: spaceType,
          parentId: id,
        },
      })
      .then((response) => {
        if (response.length <= 0) {
          data[spaceType].children.push({
            id: 'empty',
            name: '',
            parent_id: id,
            children: [],
            resource_type: 'file',
            space_type: 'private',
            namespace: { id: namespaceId },
          });
        } else {
          each(response, (item) => {
            data[spaceType].children.push(item);
          });
        }
        onData({ ...data });
      });
  };
  const getRouteToActive = (
    id: string,
    spaceType: SpaceType,
    parentId: string,
  ) => {
    let activeKey = 'chat';
    const items = data[spaceType].children.filter(
      (node) => node.parent_id === parentId,
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
        (node) => node.id === parentId,
      );
      if (parentIndex >= 0) {
        activeKey = '';
      }
    }
    return activeKey;
  };
  const handleDelete = (id: string, spaceType: SpaceType, parentId: string) => {
    onEditingKey(id);
    http
      .delete(`/namespaces/${namespaceId}/resources/${id}`)
      .then(() => {
        const routeToActive = getRouteToActive(id, spaceType, parentId);
        data[spaceType].children = data[spaceType].children.filter(
          (node) => ![node.id, node.parent_id].includes(id),
        );
        onData({ ...data });
        if (routeToActive) {
          app.fire('resource_children', true);
          navigate(`/${namespaceId}/${routeToActive}`);
          toast(t('resource.deleted'), {
            description: t('resource.deleted_description'),
            action: {
              label: t('undo'),
              onClick: () => {
                http
                  .post(`/namespaces/${namespaceId}/resources/${id}/restore`)
                  .then((response) => {
                    activeRoute(spaceType, parentId, response);
                  });
              },
            },
          });
        }
      })
      .finally(() => {
        onEditingKey('');
      });
  };
  const activeRoute = (
    spaceType: string,
    parentId: string,
    resource: Resource,
  ) => {
    if (!data[spaceType]) {
      data[spaceType] = { ...resource, children: [] };
    } else {
      if (!Array.isArray(data[spaceType].children)) {
        data[spaceType].children = [{ ...resource, children: [] }];
      } else {
        const index = data[spaceType].children.findIndex(
          (item) => item.parent_id === parentId && item.id === 'empty',
        );
        if (index >= 0) {
          data[spaceType].children[index] = { ...resource, children: [] };
        } else {
          data[spaceType].children.push({ ...resource, children: [] });
        }
      }
    }
    onData({ ...data });
    if (!expands.includes(parentId)) {
      onExpands([...expands, parentId]);
    }
    handleActiveKey(resource.id);
  };
  const handleCreate = (
    spaceType: string,
    parentId: string,
    resourceType: ResourceType,
  ) => {
    onEditingKey(parentId);
    http
      .post(`/namespaces/${namespaceId}/resources`, {
        parentId: parentId,
        spaceType: spaceType,
        namespaceId: namespaceId,
        resourceType: resourceType,
      })
      .then((response: Resource) => {
        activeRoute(spaceType, parentId, response);
        resourceType !== 'folder' &&
          setTimeout(() => {
            app.fire('to_edit');
          }, 2000);
      })
      .finally(() => {
        onEditingKey('');
      });
  };
  const handleUpload = (spaceType: string, parentId: string, file: File) => {
    onEditingKey(parentId);
    const formData = new FormData();
    formData.append('parent_id', parentId);
    formData.append('namespace_id', namespaceId);
    formData.append('file', file);
    return http
      .post(`/namespaces/${namespaceId}/resources/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        activeRoute(spaceType, parentId, response);
      })
      .catch((err) => {
        toast(err && err.message ? err.message : err, {
          position: 'top-center',
        });
      })
      .finally(() => {
        onEditingKey('');
      });
  };

  useEffect(() => {
    const hooks: Array<() => void> = [];
    hooks.push(
      app.on('update_resource', (delta: Resource) => {
        each(data, (resource, key) => {
          if (
            Array.isArray(resource.children) &&
            resource.children.length > 0
          ) {
            const index = resource.children.findIndex(
              (node: Resource) => node.id === delta.id,
            );
            if (index >= 0) {
              data[key].children[index].name = delta.name;
              data[key].children[index].content = delta.content;
              return true;
            }
          }
        });
        onData({ ...data });
      }),
    );
    hooks.push(
      app.on(
        'delete_resource',
        (id: string, spaceType: SpaceType, parentId: string) => {
          const routeToActive = getRouteToActive(id, spaceType, parentId);
          data[spaceType].children = data[spaceType].children.filter(
            (node) => ![node.id, node.parent_id].includes(id),
          );
          onData({ ...data });
          if (routeToActive) {
            app.fire('resource_children', true);
            navigate(`/${namespaceId}/${routeToActive}`);
          }
        },
      ),
    );
    hooks.push(
      app.on('move_resource', (resourceId: string, targetId: string) => {
        let targetKey: SpaceType = 'private';
        let targetIndex = -1;
        let resourceKey: SpaceType = 'private';
        let resourceIndex = -1;
        each(data, (items, key) => {
          if (Array.isArray(items.children) && items.children.length > 0) {
            const maybeResourceIndex = items.children.findIndex(
              (node: Resource) => node.id === resourceId,
            );
            if (maybeResourceIndex >= 0) {
              resourceKey = key;
              resourceIndex = maybeResourceIndex;
            }
            const maybeTargetIndex = items.children.findIndex(
              (node: Resource) => node.id === targetId,
            );
            if (maybeTargetIndex >= 0) {
              targetKey = key;
              targetIndex = maybeTargetIndex;
            }
          }
        });
        if (targetIndex < 0 || resourceIndex < 0) {
          return;
        }
        const target = data[targetKey].children[targetIndex];
        const resource = data[resourceKey].children[resourceIndex];
        const emptyTargetIndex = data[targetKey].children.findIndex(
          (item) => item.parent_id === target.id && item.id === 'empty',
        );
        if (emptyTargetIndex >= 0) {
          data[targetKey].children.splice(emptyTargetIndex, 1);
        }
        const resourceChildrenIdToRemove: Array<string> = [];
        each(data[resourceKey].children, (item) => {
          if (
            item.parent_id === resource.id ||
            resourceChildrenIdToRemove.includes(item.parent_id)
          ) {
            resourceChildrenIdToRemove.push(item.id);
          }
        });
        if (resourceChildrenIdToRemove.length > 0) {
          data[resourceKey].children = data[resourceKey].children.filter(
            (item) => !resourceChildrenIdToRemove.includes(item.id),
          );
        }
        if (targetKey === resourceKey) {
          data[resourceKey].children[resourceIndex].parent_id = target.id;
        } else {
          const resources = data[resourceKey].children.splice(resourceIndex, 1);
          resources[0].space_type = targetKey;
          resources[0].parent_id = target.id;
          const emptyResourceIndex = data[resourceKey].children.findIndex(
            (item) => item.parent_id === resources[0].id && item.id === 'empty',
          );
          if (emptyResourceIndex >= 0) {
            data[resourceKey].children.splice(emptyResourceIndex, 1);
          }
          data[targetKey].children.push(resources[0]);
        }
        onData({ ...data });
        onExpands((expands) =>
          expands.filter((expand) => expand !== resource.id),
        );
      }),
    );
    hooks.push(
      app.on(
        'generate_resource',
        (spaceType: string, parentId: string, resource: Resource) => {
          activeRoute(spaceType, parentId, resource);
        },
      ),
    );
    return () => {
      each(hooks, (destory) => {
        destory();
      });
    };
  }, [data]);

  useEffect(() => {
    if (resourceId || chatPage) {
      return;
    }
    let node: any = null;
    each(data, (resource) => {
      if (Array.isArray(resource.children) && resource.children.length > 0) {
        node = resource.children[0];
        return true;
      }
      return;
    });
    if (node && node.id) {
      app.fire('resource_children', true);
      navigate(`/${namespaceId}/${node.id}`);
    }
  }, [chatPage, namespaceId, resourceId, data]);

  useEffect(() => {
    if (!localStorage.getItem('uid')) {
      return;
    }
    Promise.all(
      spaceTypes.map((spaceType) =>
        http.get(`/namespaces/${namespaceId}/root`, {
          params: { namespace_id: namespaceId, space_type: spaceType },
        }),
      ),
    ).then((response) => {
      const state: IData = {};
      response.forEach((item) => {
        state[item.space_type] = item;
      });
      onData(state);
    });
  }, [namespaceId]);

  return {
    data,
    expands,
    chatPage,
    expanding,
    editingKey,
    resourceId,
    namespaceId,
    handleExpand,
    handleDelete,
    handleCreate,
    handleUpload,
    handleMenuMore,
    handleActiveKey,
  };
}
