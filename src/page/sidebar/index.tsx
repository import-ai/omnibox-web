import Space from './space';
import each from '@/lib/each';
import { NavMain } from './main';
import group from '@/lib/group';
import useApp from '@/hooks/use-app';
import { Switcher } from './switcher';
import { http } from '@/lib/request';
import { useEffect, useState } from 'react';
import { getNamespace } from '@/lib/namespace';
import { useNavigate, useParams } from 'react-router-dom';
import { IResourceData, Resource, ResourceType, SpaceType } from '@/interface';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';

const baseUrl = 'resources';
const spaceTypes = ['private', 'teamspace'];

interface IData {
  [index: string]: IResourceData;
}

export default function MainSidebar() {
  const app = useApp();
  const params = useParams();
  const navigate = useNavigate();
  const namespace = getNamespace().id;
  const resource_id = params.resource_id || '';
  const [expanding, onExpanding] = useState('');
  const [editingKey, onEditingKey] = useState('');
  const [expands, onExpands] = useState<Array<string>>([]);
  const [data, onData] = useState<{
    [index: string]: IResourceData;
  }>({});
  const handleActiveKey = (id: string) => {
    navigate(`/${id}`);
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
      .get(`/${baseUrl}/query`, {
        params: { namespace, space_type, parentId: id },
      })
      .then((response) => {
        each(response, (item) => {
          data[space_type].children.push(item);
        });
        onData({ ...data });
        expands.push(id);
        onExpands([...expands]);
        onExpanding('');
      })
      .catch(() => {
        onExpanding('');
      });
  };
  const handleDelete = (id: string, space_type: SpaceType) => {
    onEditingKey(id);
    http
      .delete(`/${baseUrl}/${id}`)
      .then(() => {
        let activeKey = '';
        const index = data[space_type].children.findIndex(
          (node: Resource) => node.id === id,
        );
        if (index > 0) {
          activeKey = data[space_type].children[index - 1].id;
        } else {
          const next = data[space_type].children[index + 1];
          if (next) {
            activeKey = next.id;
          } else {
            const parent = data[space_type].children.find(
              (node: Resource) =>
                node.id === data[space_type].children[index].parent_id,
            );
            if (parent) {
              activeKey = parent.id;
            }
          }
        }
        data[space_type].children = data[space_type].children.filter(
          (node) => ![node.id, node.parent_id].includes(id),
        );
        onData({ ...data });
        if (activeKey) {
          app.fire('resource_children', true);
          navigate(`/${activeKey}`);
        }
      })
      .finally(() => {
        onEditingKey('');
      });
  };
  const handleCreate = (
    namespace: string,
    space_type: string,
    parent_id: string,
    resource_type: ResourceType,
  ) => {
    onEditingKey(parent_id);
    http
      .post(`/${baseUrl}`, {
        parentId: parent_id,
        spaceType: space_type,
        namespaceId: namespace,
        resourceType: resource_type,
      })
      .then((response: Resource) => {
        if (!data[space_type]) {
          data[space_type] = { ...response, children: [] };
        } else {
          if (!Array.isArray(data[space_type].children)) {
            data[space_type].children = [];
          }
          const index = data[space_type].children.findIndex(
            (item) => item.id === parent_id,
          );
          if (index >= 0) {
            data[space_type].children[index].child_count += 1;
          } else {
            data[space_type].child_count += 1;
          }
          data[space_type].children.push({ ...response, children: [] });
        }
        onData({ ...data });
        if (!expands.includes(parent_id)) {
          onExpands([...expands, parent_id]);
        }
        handleActiveKey(response.id);
      })
      .finally(() => {
        onEditingKey('');
      });
  };

  useEffect(() => {
    return app.on('resource_update', (delta: Resource) => {
      each(data, (resource, key) => {
        if (Array.isArray(resource.children) && resource.children.length > 0) {
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
    });
  }, [data]);

  useEffect(() => {
    if (resource_id) {
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
      navigate(`/${node.id}`);
    }
  }, [resource_id, data]);

  useEffect(() => {
    // 未登陆不请求数据
    if (!localStorage.getItem('uid')) {
      return;
    }
    Promise.all(
      spaceTypes.map((space_type) =>
        http.get(`/${baseUrl}/root`, {
          params: { namespace_id: namespace, space_type: space_type },
        }),
      ),
    ).then((response) => {
      const state: IData = {};
      response.forEach((item) => {
        state[item.space_type] = item;
      });
      onData(state);
    });
  }, [namespace]);

  return (
    <Sidebar>
      <SidebarHeader>
        <Switcher namespace={namespace} />
        <NavMain
          active={resource_id === 'chat'}
          onActiveKey={handleActiveKey}
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
              namespace={namespace}
              onExpand={handleExpand}
              onDelete={handleDelete}
              onCreate={handleCreate}
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
