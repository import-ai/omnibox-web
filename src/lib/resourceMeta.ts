import { ResourceMeta, ResourceType } from '@/interface';
import { PrivateSearchResourceType } from '@/page/chat/chat-input/types';

export type ResourceMetaLike = Partial<ResourceMeta> & {
  id: string;
  parentId?: string | null;
  resourceType?: ResourceType;
  hasChildren?: boolean;
};

interface NormalizeResourceMetaOptions {
  fallbackType?: ResourceType;
  contextType?: PrivateSearchResourceType;
}

const CONTAINER_RESOURCE_TYPES: ResourceType[] = [
  'folder',
  'smart_folder',
  'rss_folder',
];

export function isContainerResourceType(type: ResourceType): boolean {
  return CONTAINER_RESOURCE_TYPES.includes(type);
}

export function normalizeResourceMeta(
  resource: ResourceMetaLike,
  options: NormalizeResourceMetaOptions = {}
): ResourceMeta {
  const actualType =
    resource.resource_type ??
    resource.resourceType ??
    options.fallbackType ??
    'doc';
  // Attaching a resource as "all files in it" draws a folder — unless it is
  // already a container, which has an icon of its own to keep.
  const resourceType =
    options.contextType === 'folder' && !isContainerResourceType(actualType)
      ? 'folder'
      : actualType;

  return {
    id: resource.id,
    name: resource.name,
    parent_id: resource.parent_id ?? resource.parentId ?? null,
    resource_type: resourceType,
    created_at: resource.created_at,
    updated_at: resource.updated_at,
    attrs: resource.attrs,
    has_children: resource.has_children ?? resource.hasChildren,
  };
}
