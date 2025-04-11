import axios from 'axios';
import { useState, useEffect } from 'react';
import Space from '@/components/sidebar/space';
import { Command, Sparkles } from 'lucide-react';
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

const baseUrl = '/api/v1/resources';
const spaceTypes = ['private', 'teamspace'];

export function MainSidebar() {
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
    axios
      .get(`${baseUrl}/${rid}`)
      .then((response) => {
        const res: Resource = response.data;
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
    axios
      .post(baseUrl, { namespace, spaceType, parentId, resourceType })
      .then((response) => {
        const createdResource: Resource = response.data;
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
    axios
      .delete(`${baseUrl}/${r.id}`)
      .then((response) => {
        if (r.id === response.data.id) {
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
        axios.get(`${baseUrl}/${resource.parentId}`).then((response) => {
          expandToRoot(response.data);
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
    for (const spaceType of spaceTypes) {
      axios
        .get(`${baseUrl}/root`, { params: { namespace, spaceType } })
        .then((response) => {
          const rootResource: Resource = response.data;
          setRootResourceId((prev) => ({
            ...prev,
            [spaceType]: rootResource.id,
          }));
          axios
            .get(baseUrl, { params: { namespace, spaceType } })
            .then((response) => {
              const resources: Resource[] = response.data;
              if (resources.length > 0) {
                updateChild(rootResource.id, resources);
              }
            });
        });
    }

    return () => {
      for (const setter of [setRootResourceId, setIsExpanded, setChild]) {
        setter({});
      }
    };
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
      axios
        .get(baseUrl, { params: { namespace, spaceType, parentId } })
        .then((response) => {
          const childData: Resource[] = response.data;
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
