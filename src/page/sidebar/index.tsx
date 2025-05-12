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
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  const loc = useLocation();
  const navigate = useNavigate();
  const chatPage = loc.pathname.endsWith('chat');
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
      .get(`/namespaces/${namespace_id}/${baseUrl}/query`, {
        params: {
          namespace: namespace_id,
          spaceType: space_type,
          parentId: id,
        },
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
  const handleDelete = (
    id: string,
    space_type: SpaceType,
    parent_id: string,
  ) => {
    onEditingKey(id);
    http
      .delete(`/namespaces/${namespace_id}/${baseUrl}/${id}`)
      .then(() => {
        let activeKey = 'chat';
        const items = data[space_type].children.filter(
          (node) => node.parent_id === parent_id,
        );
        if (items.length > 0) {
          const itemsOrder = orderBy(items, ['updated_at'], ['desc']);
          const index = itemsOrder.findIndex(
            (node: Resource) => node.id === id,
          );
          if (index > 0) {
            activeKey = itemsOrder[index - 1].id;
          } else {
            const next = itemsOrder[index + 1];
            if (next) {
              activeKey = next.id;
            }
          }
        }
        data[space_type].children = data[space_type].children.filter(
          (node) => ![node.id, node.parent_id].includes(id),
        );
        onData({ ...data });
        if (id !== resource_id) {
          // 直接删除父级
          const parentIndex = data[space_type].children.findIndex(
            (node) => node.id === parent_id,
          );
          if (parentIndex < 0) {
            app.fire('resource_children', true);
            navigate(`/${namespace_id}/chat`);
          }
        } else {
          // 删除当前选中
          if (activeKey) {
            app.fire('resource_children', true);
            navigate(`/${namespace_id}/${activeKey}`);
          }
        }
      })
      .finally(() => {
        onEditingKey('');
      });
  };
  const handleCreate = (
    namespace_id: string,
    space_type: string,
    parent_id: string,
    resource_type: ResourceType,
  ) => {
    onEditingKey(parent_id);
    http
      .post(`/namespaces/${namespace_id}/${baseUrl}`, {
        parentId: parent_id,
        spaceType: space_type,
        namespaceId: namespace_id,
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
        onEditingKey('');
      })
      .catch((err) => {
        toast(err && err.message ? err.message : err, {
          position: 'top-center',
        });
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
    // 未登陆不请求数据
    if (!localStorage.getItem('uid')) {
      return;
    }
    Promise.all(
      spaceTypes.map((space_type) =>
        http.get(`/namespaces/${namespace_id}/${baseUrl}/root`, {
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
        <NavMain active={chatPage} onActiveKey={handleActiveKey} />
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
              namespace_id={namespace_id}
              onExpand={handleExpand}
              onDelete={handleDelete}
              onCreate={handleCreate}
              onUpload={handleUpload}
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
