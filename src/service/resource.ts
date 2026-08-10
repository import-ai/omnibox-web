import {
  Resource,
  ResourceMeta,
  ResourceType,
  RssItem,
  RssItemDetail,
  Task,
} from '@/interface';
import { http, type RequestConfig } from '@/lib/request';
import { uploadFiles } from '@/lib/uploadFiles';

export type RootResourcesResponse = Record<
  string,
  Resource & { children?: Resource[] }
>;

export type ResourceSortBy = 'updated_at' | 'created_at' | 'title' | 'manual';
export type ResourceSortOrder = 'asc' | 'desc';

export interface ResourceSortOptions {
  sort_by: ResourceSortBy;
  sort_order: ResourceSortOrder;
}

export interface ManualResourceOrder {
  parent_id: string;
  resource_ids: string[];
}

export interface UpdateManualSortPayload {
  root_resource_id: string;
  resource_id?: string;
  target_parent_id?: string;
  orders: ManualResourceOrder[];
}

export interface InitializeManualSortResponse {
  initialized_at: string;
  overwritten: boolean;
}

export interface CreatePayload {
  parentId: string;
  resourceType: ResourceType;
  name?: string;
}

export interface BatchTrashResponse {
  success_ids: string[];
  failed_ids: string[];
}

export interface BatchMoveResponse {
  success_ids: string[];
  failed_ids: string[];
  name_conflict_ids?: string[];
}

export interface BatchCreateFolderPayload {
  name: string;
  parentId: string;
  resourceIds: string[];
}

export type BatchCreateFolderResponse = Partial<Resource> & {
  success_ids: string[];
  failed_ids: string[];
  name_conflict_ids?: string[];
};

interface IndexedResourceSearchResult {
  type: 'resource';
  id: string;
  resource_id: string;
  title: string;
  attrs?: Record<string, any>;
  resource_type: ResourceType;
}

export function fetchChildren(
  namespaceId: string,
  id: string,
  sort?: ResourceSortOptions,
  config?: RequestConfig
): Promise<Resource[]> {
  return http.get<Resource[]>(
    `/namespaces/${namespaceId}/resources/${id}/children`,
    sort ? { ...config, params: { ...config?.params, ...sort } } : config
  );
}

export function fetchRootResources(
  namespaceId: string,
  config?: RequestConfig,
  sort?: ResourceSortOptions
): Promise<RootResourcesResponse> {
  return http.get<RootResourcesResponse>(
    `/namespaces/${namespaceId}/root`,
    sort ? { ...config, params: { ...config?.params, ...sort } } : config
  );
}

export function fetchSmartFolderChildren(
  namespaceId: string,
  id: string
): Promise<Resource[]> {
  return http.get<Resource[]>(
    `/namespaces/${namespaceId}/smart-folders/${id}/children`
  );
}

export function fetchRssItems(
  namespaceId: string,
  id: string,
  options?: { limit?: number; offset?: number; signal?: AbortSignal }
): Promise<RssItem[]> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set('limit', String(options.limit));
  }
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params}` : '';
  return http.get<RssItem[]>(
    `/namespaces/${namespaceId}/rss-folders/${id}/items${query}`,
    { signal: options?.signal }
  );
}

export function fetchRssItem(
  namespaceId: string,
  folderId: string,
  itemId: string,
  signal?: AbortSignal
): Promise<RssItemDetail> {
  return http.get<RssItemDetail>(
    `/namespaces/${namespaceId}/rss-folders/${folderId}/items/${itemId}`,
    { signal }
  );
}

export function searchResources(
  namespaceId: string,
  query: string
): Promise<ResourceMeta[]> {
  const params = new URLSearchParams();
  if (query) {
    params.set('query', query);
  }
  params.set('type', 'resource');
  return http
    .get<IndexedResourceSearchResult[]>(
      `/namespaces/${namespaceId}/search?${params.toString()}`
    )
    .then(resources =>
      resources.map<ResourceMeta>(resource => ({
        id: resource.resource_id,
        name: resource.title,
        parent_id: null,
        resource_type: resource.resource_type,
        attrs: resource.attrs,
      }))
    );
}

export function createResource(namespaceId: string, payload: CreatePayload) {
  return http.post<Resource>(`/namespaces/${namespaceId}/resources`, payload);
}

export function deleteResource(namespaceId: string, id: string) {
  return http.delete(`/namespaces/${namespaceId}/resources/${id}`);
}

export function renameResource(namespaceId: string, id: string, name: string) {
  return http.patch<Resource>(`/namespaces/${namespaceId}/resources/${id}`, {
    name,
  });
}

export function moveResource(
  namespaceId: string,
  dragId: string,
  dropId: string
) {
  return http.post(
    `/namespaces/${namespaceId}/resources/${dragId}/move/${dropId}`
  );
}

export function initializeManualSort(
  namespaceId: string,
  rootResourceId: string,
  sort: ResourceSortOptions,
  overwrite = false
) {
  return http.post<InitializeManualSortResponse>(
    `/namespaces/${namespaceId}/resources/${rootResourceId}/manual-sort`,
    { ...sort, overwrite }
  );
}

export function updateManualSort(
  namespaceId: string,
  payload: UpdateManualSortPayload,
  config?: RequestConfig
) {
  const url = `/namespaces/${namespaceId}/resources/manual-sort`;
  return config
    ? http.put<void>(url, payload, config)
    : http.put<void>(url, payload);
}

export function fetchResource(
  namespaceId: string,
  targetId: string,
  signal?: AbortSignal
): Promise<Resource> {
  return http.get<Resource>(
    `/namespaces/${namespaceId}/resources/${targetId}`,
    {
      mute: true,
      signal,
    }
  );
}

export function fetchResourcesByIds(
  namespaceId: string,
  ids: string[],
  config?: RequestConfig
) {
  return http.get<Resource[]>(
    `/namespaces/${namespaceId}/resources?id=${ids.join(',')}`,
    config
  );
}

export function fetchResourceTasks(
  namespaceId: string,
  id: string,
  config?: RequestConfig
): Promise<Task[]> {
  return http.get<Task[]>(
    `/namespaces/${namespaceId}/resources/${id}/tasks`,
    config
  );
}

export function retryResourceParse(namespaceId: string, id: string) {
  return http.post<Task>(
    `/namespaces/${namespaceId}/resources/${id}/retry-parse`,
    undefined,
    { mute: true }
  );
}

export function restoreResource(namespaceId: string, id: string) {
  return http.post<Resource>(
    `/namespaces/${namespaceId}/resources/${id}/restore`
  );
}

export function uploadResource(
  files: FileList,
  options: {
    parentId: string;
    namespaceId: string;
    onProgress?: (progress: { done: number; total: number }) => void;
  }
) {
  return uploadFiles(files, options);
}

export function batchDeleteResources(
  namespaceId: string,
  resourceIds: string[]
) {
  return http.post<BatchTrashResponse>(
    `/namespaces/${namespaceId}/resources/batch-trash`,
    { resourceIds },
    { mute: true }
  );
}

export function batchMoveResources(
  namespaceId: string,
  resourceIds: string[],
  targetId: string
) {
  return http.post<BatchMoveResponse>(
    `/namespaces/${namespaceId}/resources/batch-move`,
    { resourceIds, targetId },
    { mute: true }
  );
}

export function batchCreateFolderFromResources(
  namespaceId: string,
  payload: BatchCreateFolderPayload
) {
  return http.post<BatchCreateFolderResponse>(
    `/namespaces/${namespaceId}/resources/batch-folder`,
    payload,
    { mute: true }
  );
}
