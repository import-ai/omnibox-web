import Space from './space';
import each from '@/lib/each';
import { NavMain } from './main';
import group from '@/lib/group';
import useApp from '@/hooks/use-app';
import { Switcher } from './switcher';
import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import { getNamespace } from '@/lib/namespace';
import { useParams, useNavigate } from 'react-router-dom';
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
  const app = useApp();
  const params = useParams();
  const navigate = useNavigate();
  const namespace = getNamespace().id;
  const resourceId = params.resourceId || '';
  const [expanding, onExpanding] = useState('');
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
    http.delete(`/${baseUrl}/${id}`).then(() => {
      data[spaceType].children = data[spaceType].children.filter(
        (node) => ![node.id, node.parentId].includes(id),
      );
      onData({ ...data });
    });
  };
  const handleCreate = (
    namespace: string,
    spaceType: string,
    parentId: string,
    resourceType: ResourceType,
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
      navigate(`/${node.id}`);
    }
  }, [resourceId, data]);

  useEffect(() => {
    Promise.all(
      spaceTypes.map((spaceType) =>
        http.get(`/${baseUrl}/root`, { params: { namespace, spaceType } }),
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
