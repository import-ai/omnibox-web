import Space from './space';
import each from '@/lib/each';
import { toast } from 'sonner';
import { NavMain } from './main';
import group from '@/lib/group';
import { orderBy } from 'lodash-es';
import useApp from '@/hooks/use-app';
import { Switcher } from './switcher';
import { http } from '@/lib/request';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { IResourceData, Resource, ResourceType, SpaceType } from '@/interface';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';

const spaceTypes = ['private', 'teamspace'];

interface IData {
  [index: string]: IResourceData;
}

interface IProps {
  onSearch: () => void;
}

export default function MainSidebar({ onSearch }: IProps) {
  const app = useApp();
  const params = useParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const chatPage = loc.pathname.includes('/chat');
  const resource_id = params.resource_id || '';
  const namespace_id = params.namespace_id || '';
  const [expanding, onExpanding] = useState('');
  const [editingKey, onEditingKey] = useState('');
  const [expands, onExpands] = useState<Array<string>>([]);
  const [data, onData] = useState<{
    [index: string]: IResourceData;
  }>({});
  const handleActiveKey = (id: string) => {
    navigate(`/${namespace_id}/${id}`);
  };
  const handleExpand = (id: string, space_type: SpaceType) => {
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
      .get(`/namespaces/${namespace_id}/resources/query`, {
        params: {
          namespace: namespace_id,
          spaceType: space_type,
          parentId: id,
        },
      })
      .then((response) => {
        if (response.length <= 0) {
          data[space_type].children.push({
            id: 'empty',
            name: '',
            parent_id: id,
            children: [],
            resource_type: 'file',
            space_type: 'private',
            namespace: { id: namespace_id },
          });
        } else {
          each(response, (item) => {
            data[space_type].children.push(item);
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
  const handleMenuMore = (id: string, space_type: SpaceType) => {
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
      .get(`/namespaces/${namespace_id}/resources/query`, {
        params: {
          namespace: namespace_id,
          spaceType: space_type,
          parentId: id,
        },
      })
      .then((response) => {
        if (response.length <= 0) {
          data[space_type].children.push({
            id: 'empty',
            name: '',
            parent_id: id,
            children: [],
            resource_type: 'file',
            space_type: 'private',
            namespace: { id: namespace_id },
          });
        } else {
          each(response, (item) => {
            data[space_type].children.push(item);
          });
        }
        onData({ ...data });
      });
  };
  const getRouteToActive = (
    id: string,
    space_type: SpaceType,
    parent_id: string,
  ) => {
    let activeKey = 'chat';
    const items = data[space_type].children.filter(
      (node) => node.parent_id === parent_id,
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
    if (id !== resource_id) {
      const parentIndex = data[space_type].children.findIndex(
        (node) => node.id === parent_id,
      );
      if (parentIndex >= 0) {
        activeKey = '';
      }
    }
    return activeKey;
  };
  const handleDelete = (
    id: string,
    space_type: SpaceType,
    parent_id: string,
  ) => {
    onEditingKey(id);
    http
      .delete(`/namespaces/${namespace_id}/resources/${id}`)
      .then(() => {
        const routeToActive = getRouteToActive(id, space_type, parent_id);
        data[space_type].children = data[space_type].children.filter(
          (node) => ![node.id, node.parent_id].includes(id),
        );
        onData({ ...data });
        if (routeToActive) {
          app.fire('resource_children', true);
          navigate(`/${namespace_id}/${routeToActive}`);
          toast(t('resource.deleted'), {
            description: t('resource.deleted_description'),
            action: {
              label: t('undo'),
              onClick: () => {
                http
                  .post(`/namespaces/${namespace_id}/resources/${id}/restore`)
                  .then((response) => {
                    activeRoute(space_type, parent_id, response);
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
    space_type: string,
    parent_id: string,
    resource: Resource,
  ) => {
    if (!data[space_type]) {
      data[space_type] = { ...resource, children: [] };
    } else {
      if (!Array.isArray(data[space_type].children)) {
        data[space_type].children = [{ ...resource, children: [] }];
      } else {
        const index = data[space_type].children.findIndex(
          (item) => item.parent_id === parent_id && item.id === 'empty',
        );
        if (index >= 0) {
          data[space_type].children[index] = { ...resource, children: [] };
        } else {
          data[space_type].children.push({ ...resource, children: [] });
        }
      }
    }
    onData({ ...data });
    if (!expands.includes(parent_id)) {
      onExpands([...expands, parent_id]);
    }
    handleActiveKey(resource.id);
  };
  const handleCreate = (
    namespace_id: string,
    space_type: string,
    parent_id: string,
    resource_type: ResourceType,
  ) => {
    onEditingKey(parent_id);
    http
      .post(`/namespaces/${namespace_id}/resources`, {
        parentId: parent_id,
        spaceType: space_type,
        namespaceId: namespace_id,
        resourceType: resource_type,
      })
      .then((response: Resource) => {
        activeRoute(space_type, parent_id, response);
        resource_type !== 'folder' &&
          setTimeout(() => {
            app.fire('to_edit');
          }, 2000);
      })
      .finally(() => {
        onEditingKey('');
      });
  };
  const handleUpload = (
    namespace_id: string,
    space_type: string,
    parent_id: string,
    file: File,
  ) => {
    onEditingKey(parent_id);
    const formData = new FormData();
    formData.append('parent_id', parent_id);
    formData.append('namespace_id', namespace_id);
    formData.append('file', file);
    return http
      .post(`/namespaces/${namespace_id}/resources/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        activeRoute(space_type, parent_id, response);
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
      app.on('resource_update', (delta: Resource) => {
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
        (id: string, space_type: SpaceType, parent_id: string) => {
          const routeToActive = getRouteToActive(id, space_type, parent_id);
          data[space_type].children = data[space_type].children.filter(
            (node) => ![node.id, node.parent_id].includes(id),
          );
          onData({ ...data });
          if (routeToActive) {
            app.fire('resource_children', true);
            navigate(`/${namespace_id}/${routeToActive}`);
          }
        },
      ),
    );
    hooks.push(
      app.on(
        'generate_resource',
        (space_type: string, parent_id: string, resource: Resource) => {
          activeRoute(space_type, parent_id, resource);
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
    if (resource_id || chatPage) {
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
      navigate(`/${namespace_id}/${node.id}`);
    }
  }, [chatPage, namespace_id, resource_id, data]);

  useEffect(() => {
    if (!localStorage.getItem('uid')) {
      return;
    }
    Promise.all(
      spaceTypes.map((space_type) =>
        http.get(`/namespaces/${namespace_id}/root`, {
          params: { namespace_id: namespace_id, space_type: space_type },
        }),
      ),
    ).then((response) => {
      const state: IData = {};
      response.forEach((item) => {
        state[item.space_type] = item;
      });
      onData(state);
    });
  }, [namespace_id]);

  return (
    <Sidebar>
      <SidebarHeader>
        <Switcher namespace_id={namespace_id} />
        <NavMain
          active={chatPage}
          onActiveKey={handleActiveKey}
          onSearch={onSearch}
        />
      </SidebarHeader>
      <SidebarContent>
        {spaceTypes.map((space_type: string) => {
          return (
            <Space
              key={space_type}
              expands={expands}
              expanding={expanding}
              activeKey={resource_id}
              space_type={space_type}
              editingKey={editingKey}
              onExpand={handleExpand}
              onDelete={handleDelete}
              onCreate={handleCreate}
              onUpload={handleUpload}
              onMenuMore={handleMenuMore}
              namespace_id={namespace_id}
              onActiveKey={handleActiveKey}
              data={group(data[space_type])}
            />
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
