import { http } from '@/utils/request';
// import SettingsPage from '@/app/user/profile';
import Space from '@/components/sidebar/space';
import { Command, Sparkles } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { NavMain } from '@/components/sidebar/nav-main';
import { useNavigate, useParams } from 'react-router-dom';
import type { Resource, ResourceType } from '@/types/resource';
import { useResource } from '@/components/provider/resource-provider';
import { NamespaceSwitcher } from '@/components/sidebar/namespace-switcher';
import { useGlobalContext } from '@/components/provider/global-context-provider';
import {
  Sidebar,
  SidebarRail,
  SidebarHeader,
  SidebarContent,
} from '@/components/ui/sidebar';

const baseUrl = 'resources';
const spaceTypes = ['private', 'teamspace'];

export function MainSidebar() {
  const lastNamespace = useRef<string | null>(null);
  const [rootResourceId, setRootResourceId] = useState<Record<string, string>>(
    {}
  );
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({}); // key: resourceId
  const { child, setChild } = useGlobalContext().resourceTreeViewState;
  const { namespace } = useParams();
  const { resource } = useResource();
  const navigate = useNavigate();

  if (!namespace) {
    throw new Error('namespace is required');
  }

  const fetchResource = (rid: string) => {
    http
      .get(`/${baseUrl}/${rid}`)
      .then((res: Resource) => {
        const parentId: string | undefined = res.parentId;
        if (parentId) {
          setChild((prev) => ({
            ...prev,
            [parentId]: prev[parentId].map((r) => (r.id === rid ? res : r)),
          }));
        }
      })
      .catch((error) => {
        console.error({ error });
        throw error;
      });
  };

  const createResource = (
    namespace: string,
    spaceType: string,
    parentId: string,
    resourceType: ResourceType
  ) => {
    http
      .post(`/${baseUrl}`, { namespace, spaceType, parentId, resourceType })
      .then((createdResource: Resource) => {
        expandToRoot(createdResource);

        // Update parent's child
        updateChild(parentId, [...(child[parentId] ?? []), createdResource]);
        // Update parent's childCount
        fetchResource(parentId);

        if (resourceType === 'file') {
          navigate(`${createdResource.id}/edit`);
        }
      })
      .catch((error) => {
        console.error({ error });
        throw error;
      });
  };

  const deleteChild = (r: Resource) => {
    if (r.id in child) {
      for (const c of child[r.id]) {
        if (resource?.id === c.id) {
          navigate('.');
        }
        deleteChild(c);
      }
    }
  };

  const deleteResource = (r: Resource) => {
    http
      .delete(`/${baseUrl}/${r.id}`)
      .then((response) => {
        if (r.id === response.id) {
          if (r.parentId in child) {
            updateChild(
              r.parentId,
              child[r.parentId].filter((resource) => resource.id !== r.id)
            );
          }
          fetchResource(r.parentId);
          if (resource?.id === r.id) {
            navigate('.');
          }
          deleteChild(r);
        }
      })
      .catch((error) => {
        console.error({ error });
        throw error;
      });
  };

  const updateChild = (resourceId: string, resources: Resource[]) => {
    setChild((prev) => ({ ...prev, [resourceId]: resources }));
    if (!(resourceId in isExpanded)) {
      setIsExpanded((prev) => ({ ...prev, [resourceId]: false }));
    }
  };

  const expandToRoot = (resource: Resource) => {
    if (
      resource.parentId != rootResourceId[resource.spaceType] &&
      !isExpanded[resource.parentId]
    ) {
      fetchChild(namespace, resource.spaceType, resource.parentId).then(() => {
        setIsExpanded((prev) => ({ ...prev, [resource.parentId]: true }));
        http.get(`/${baseUrl}/${resource.parentId}`).then((response) => {
          expandToRoot(response);
        });
      });
    }
  };

  useEffect(() => {
    if (resource) {
      expandToRoot(resource);
    }
  }, [resource]);

  useEffect(() => {
    if (namespace === lastNamespace.current) {
      return;
    }
    lastNamespace.current = namespace;
    for (const spaceType of spaceTypes) {
      http
        .get(`/${baseUrl}/root`, { params: { namespace, spaceType } })
        .then((rootResource: Resource) => {
          setRootResourceId((prev) => ({
            ...prev,
            [spaceType]: rootResource.id,
          }));
          http
            .get(`/${baseUrl}`, { params: { namespace, spaceType } })
            .then((resources: Resource[]) => {
              if (resources.length > 0) {
                updateChild(rootResource.id, resources);
              }
            });
        });
    }
  }, [namespace]);

  const expandToggle = (resourceId: string) => {
    setIsExpanded((prev) => ({ ...prev, [resourceId]: !prev[resourceId] }));
  };

  const fetchChild = async (
    namespace: string,
    spaceType: string,
    parentId: string,
    cache = true
  ) => {
    if (!(parentId in child && cache)) {
      http
        .get(`/${baseUrl}`, { params: { namespace, spaceType, parentId } })
        .then((childData: Resource[]) => {
          setChild((prev) => ({
            ...prev,
            [parentId]: childData,
          }));
        });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <NamespaceSwitcher namespaces={[{ name: 'test', logo: Command }]} />
        <NavMain items={[{ title: 'Chat', url: './', icon: Sparkles }]} />
      </SidebarHeader>
      <SidebarContent>
        {spaceTypes.map((spaceType: string, index: number) => (
          <Space
            key={index}
            spaceType={spaceType}
            namespace={namespace}
            isExpanded={isExpanded}
            fetchChild={fetchChild}
            expandToggle={expandToggle}
            resource={resource || undefined}
            createResource={createResource}
            deleteResource={deleteResource}
            data={child[rootResourceId[spaceType]]}
            resourceType={rootResourceId[spaceType]}
          />
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
