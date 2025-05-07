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
  const resourceId = params.resourceId || '';
  const [expanding, onExpanding] = useState('');
  const [editingKey, onEditingKey] = useState('');
  const [expands, onExpands] = useState<Array<string>>([]);
  const [data, onData] = useState<{
    [index: string]: IResourceData;
  }>({});
  const handleActiveKey = (id: string) => {
    navigate(`/${id}`);
  };
  const handleExpand = (id: string, spaceType: SpaceType) => {
    let match = false;
    each(data, (resource) => {
      if (Array.isArray(resource.children) && resource.children.length > 0) {
        const target = resource.children.find(
          (node: Resource) => node.parentId === id,
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
        params: { namespace, spaceType, parentId: id },
      })
      .then((response) => {
        each(response, (item) => {
          data[spaceType].children.push(item);
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
  const handleDelete = (id: string, spaceType: SpaceType) => {
    onEditingKey(id);
    http
      .delete(`/${baseUrl}/${id}`)
      .then(() => {
        let activeKey = '';
        const index = data[spaceType].children.findIndex(
          (node: Resource) => node.id === id,
        );
        if (index > 0) {
          activeKey = data[spaceType].children[index - 1].id;
        } else {
          const next = data[spaceType].children[index + 1];
          if (next) {
            activeKey = next.id;
          } else {
            const parent = data[spaceType].children.find(
              (node: Resource) =>
                node.id === data[spaceType].children[index].parentId,
            );
            if (parent) {
              activeKey = parent.id;
            }
          }
        }
        data[spaceType].children = data[spaceType].children.filter(
          (node) => ![node.id, node.parentId].includes(id),
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
    spaceType: string,
    parentId: string,
    resourceType: ResourceType,
  ) => {
    onEditingKey(parentId);
    http
      .post(`/${baseUrl}`, {
        namespaceId: namespace,
        spaceType,
        parentId,
        resourceType,
      })
      .then((response: Resource) => {
        if (!data[spaceType]) {
          data[spaceType] = { ...response, children: [] };
        } else {
          if (!Array.isArray(data[spaceType].children)) {
            data[spaceType].children = [];
          }
          const index = data[spaceType].children.findIndex(
            (item) => item.id === parentId,
          );
          if (index >= 0) {
            data[spaceType].children[index].childCount += 1;
          } else {
            data[spaceType].childCount += 1;
          }
          data[spaceType].children.push({ ...response, children: [] });
        }
        onData({ ...data });
        if (!expands.includes(parentId)) {
          onExpands([...expands, parentId]);
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
    if (resourceId) {
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
  }, [resourceId, data]);

  useEffect(() => {
    // 未登陆不请求数据
    if (!localStorage.getItem('uid')) {
      return;
    }
    Promise.all(
      spaceTypes.map((spaceType) =>
        http.get(`/${baseUrl}/root`, {
          params: { namespace_id: namespace, space_type: spaceType },
        }),
      ),
    ).then((response) => {
      const state: IData = {};
      response.forEach((item) => {
        state[item.spaceType] = item;
      });
      onData(state);
    });
  }, [namespace]);

  return (
    <Sidebar>
      <SidebarHeader>
        <Switcher namespace={namespace} />
        <NavMain active={resourceId === 'chat'} onActiveKey={handleActiveKey} />
      </SidebarHeader>
      <SidebarContent>
        {spaceTypes.map((spaceType: string) => {
          return (
            <Space
              key={spaceType}
              expands={expands}
              expanding={expanding}
              activeKey={resourceId}
              spaceType={spaceType}
              editingKey={editingKey}
              namespace={namespace}
              onExpand={handleExpand}
              onDelete={handleDelete}
              onCreate={handleCreate}
              onActiveKey={handleActiveKey}
              data={group(data[spaceType])}
            />
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
