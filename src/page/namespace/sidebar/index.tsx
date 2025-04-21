import Space from './space';
import each from '@/utils/each';
import { NavMain } from './main';
import group from '@/utils/group';
import useApp from '@/hooks/use-app';
import { Switcher } from '../switcher';
import { http } from '@/utils/request';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SpaceType, Resource, ResourceType, IResourceData } from '@/interface';
import {
  Sidebar,
  SidebarRail,
  SidebarHeader,
  SidebarContent,
} from '@/components/ui/sidebar';

const baseUrl = 'resources';
const spaceTypes = ['private', 'teamspace'];

interface IData {
  [index: string]: IResourceData;
}

export default function MainSidebar() {
  const params = useParams();
  const app = useApp();
  const [activeKey, onActiveKey] = useState(0);
  const [expanding, onExpanding] = useState(0);
  const [expands, onExpands] = useState<Array<number>>([]);
  const namespace = params.namespace ? parseInt(params.namespace, 10) : 1;
  const [data, onData] = useState<{
    [index: string]: IResourceData;
  }>({});
  const handleExpand = (id: number, spaceType: SpaceType) => {
    let match = false;
    each(data, (resource) => {
      if (Array.isArray(resource.children) && resource.children.length > 0) {
        const target = resource.children.find(
          (node: Resource) => node.parentId === id
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
        onExpanding(0);
      })
      .catch(() => {
        onExpanding(0);
      });
  };
  const handleDelete = (id: number, spaceType: SpaceType) => {
    http.delete(`/${baseUrl}/${id}`).then(() => {
      data[spaceType].children = data[spaceType].children.filter(
        (node) => ![node.id, node.parentId].includes(id)
      );
      onData({ ...data });
    });
  };
  const handleCreate = (
    namespace: number,
    spaceType: string,
    parentId: number,
    resourceType: ResourceType
  ) => {
    http
      .post(`/${baseUrl}`, { namespace, spaceType, parentId, resourceType })
      .then((response: Resource) => {
        if (!data[spaceType]) {
          data[spaceType] = { ...response, children: [] };
        } else {
          if (!Array.isArray(data[spaceType].children)) {
            data[spaceType].children = [];
          }
          const index = data[spaceType].children.findIndex(
            (item) => item.id === parentId
          );
          if (index >= 0) {
            data[spaceType].children[index].childCount += 1;
          } else {
            data[spaceType].childCount += 1;
          }
          data[spaceType].children.push({ ...response, children: [] });
        }
        onData({ ...data });
        onActiveKey(response.id);
        if (!expands.includes(parentId)) {
          onExpands([...expands, parentId]);
        }
      });
  };

  useEffect(() => {
    return app.on('resource_update', (delta: Resource) => {
      each(data, (resource, key) => {
        if (Array.isArray(resource.children) && resource.children.length > 0) {
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
    });
  }, []);

  useEffect(() => {
    Promise.all(
      spaceTypes.map((spaceType) =>
        http.get(`/${baseUrl}/root`, { params: { namespace, spaceType } })
      )
    ).then((response) => {
      const state: IData = {};
      response.forEach((item) => {
        state[item.spaceType] = item;
      });
      onData(state);
    });
  }, [namespace]);

  useEffect(() => {
    if (activeKey <= 0) {
      return;
    }
    let node;
    each(data, (resource) => {
      if (Array.isArray(resource.children) && resource.children.length > 0) {
        const target = resource.children.find(
          (node: Resource) => node.id === activeKey
        );
        if (target) {
          node = target;
          return true;
        }
      }
    });
    if (!node) {
      return;
    }
    app.fire('resource_wrapper', false);
    app.fire('resource', node);
  }, [activeKey]);

  return (
    <Sidebar>
      <SidebarHeader>
        <Switcher namespace={namespace} />
        <NavMain app={app} active={activeKey === 0} onActiveKey={onActiveKey} />
      </SidebarHeader>
      <SidebarContent>
        {spaceTypes.map((spaceType: string) => {
          return (
            <Space
              key={spaceType}
              expands={expands}
              expanding={expanding}
              activeKey={activeKey}
              spaceType={spaceType}
              namespace={namespace}
              onExpand={handleExpand}
              onDelete={handleDelete}
              onCreate={handleCreate}
              onActiveKey={onActiveKey}
              data={group(data[spaceType])}
            />
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
