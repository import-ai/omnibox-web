import { Resource, ResourceMeta, ResourceType } from '@/interface';
import { http } from '@/lib/request';
import { uploadFiles } from '@/lib/upload-files';

export type RootResourcesResponse = Record<
  string,
  Resource & { children?: Resource[] }
>;

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
}

export interface BatchCreateFolderPayload {
  name: string;
  parentId: string;
  resourceIds: string[];
}

export type BatchCreateFolderResponse = Partial<Resource> & {
  success_ids: string[];
  failed_ids: string[];
};

export function fetchChildren(namespaceId: string, id: string) {
  return http.get<Resource[]>(
    `/namespaces/${namespaceId}/resources/${id}/children`
  );
}

export function fetchRootResources(namespaceId: string) {
  return http.get<RootResourcesResponse>(`/namespaces/${namespaceId}/root`);
}

export function searchResources(
  namespaceId: string,
  options: { name?: string; excludeResourceIds?: string[] }
) {
  const params = new URLSearchParams();
  if (options.name) {
    params.set('name', options.name);
  }
  if (options.excludeResourceIds?.length) {
    params.set('exclude_resource_id', options.excludeResourceIds.join(','));
  }
  return http.get<ResourceMeta[]>(
    `/namespaces/${namespaceId}/resources/search?${params.toString()}`
  );
}

export function createResource(namespaceId: string, payload: CreatePayload) {
  return http.post<Resource>(`/namespaces/${namespaceId}/resources`, payload);
}

export function deleteResource(namespaceId: string, id: string) {
  return http.delete(`/namespaces/${namespaceId}/resources/${id}`);
}

export function renameResource(namespaceId: string, id: string, name: string) {
  return http.patch(`/namespaces/${namespaceId}/resources/${id}`, { name });
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

export function fetchResource(namespaceId: string, targetId: string) {
  return http.get<Resource>(
    `/namespaces/${namespaceId}/resources/${targetId}`,
    {
      mute: true,
    }
  );
}

export function fetchResourcesByIds(namespaceId: string, ids: string[]) {
  return http.get<Resource[]>(
    `/namespaces/${namespaceId}/resources?id=${ids.join(',')}`
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
