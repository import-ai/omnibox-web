import type { SpaceType } from '@/interface';
import { http, type RequestConfig } from '@/lib/request';
import type { ResourceSortOptions } from '@/service/resource';

export interface ResourceSortPreference extends ResourceSortOptions {
  space_type: SpaceType;
}

export type ResourceSortPreferences = Record<SpaceType, ResourceSortPreference>;

export function fetchResourceSortPreferences(
  namespaceId: string,
  config?: RequestConfig
): Promise<ResourceSortPreferences> {
  return http.get<ResourceSortPreferences>(
    `/namespaces/${namespaceId}/resource-sort-preferences`,
    config
  );
}

export function updateResourceSortPreference(
  namespaceId: string,
  spaceType: SpaceType,
  sort: ResourceSortOptions
): Promise<ResourceSortPreference> {
  return http.put<ResourceSortPreference>(
    `/namespaces/${namespaceId}/resource-sort-preferences`,
    {
      space_type: spaceType,
      ...sort,
    }
  );
}
