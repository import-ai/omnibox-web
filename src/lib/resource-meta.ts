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

export function normalizeResourceMeta(
  resource: ResourceMetaLike,
  options: NormalizeResourceMetaOptions = {}
): ResourceMeta {
  const actualType =
    resource.resource_type ??
    resource.resourceType ??
    options.fallbackType ??
    'doc';
  const resourceType =
    options.contextType === 'folder' && actualType !== 'smart_folder'
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
