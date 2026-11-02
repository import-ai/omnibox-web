import type { SpaceType } from '@/interface';
import type { RequestConfig } from '@/lib/request';
import {
  fetchRootResources,
  type ResourceSortOptions,
  type RootResourcesResponse,
} from '@/service/resource';

import type { ResourcePickerResource } from './resourcePickerTypes';

export type WorkspaceResourceSorts = Record<SpaceType, ResourceSortOptions>;

export async function fetchSortedWorkspaceRootResources(
  namespaceId: string,
  sorts: WorkspaceResourceSorts,
  config?: RequestConfig
): Promise<RootResourcesResponse> {
  return fetchRootResources(namespaceId, config, sorts);
}

export function setWorkspacePickerSpace(
  resource: ResourcePickerResource,
  spaceType: SpaceType
): ResourcePickerResource {
  return {
    ...resource,
    picker_space_type: spaceType,
    children: resource.children?.map(child =>
      setWorkspacePickerSpace(child, spaceType)
    ),
  };
}

export function getWorkspacePickerSort(
  resource: ResourcePickerResource,
  sorts: WorkspaceResourceSorts
): ResourceSortOptions {
  return sorts[resource.picker_space_type ?? 'private'];
}
