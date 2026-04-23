import { Resource, ResourceType } from '@/interface';
import { http } from '@/lib/request';
import { uploadFiles } from '@/lib/upload-files';

export interface CreatePayload {
  parentId: string;
  resourceType: ResourceType;
  name?: string;
}

export interface BatchCreateItem {
  parentId: string;
  resourceType: ResourceType;
  name?: string;
}

export interface BatchMoveItem {
  id: string;
  targetId: string;
}

export interface BatchRenameItem {
  id: string;
  name: string;
}

export function fetchChildren(namespaceId: string, id: string) {
  return http.get<Resource[]>(
    `/namespaces/${namespaceId}/resources/${id}/children`
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

export function batchCreate(
  _namespaceId: string,
  _items: BatchCreateItem[]
): Promise<Resource[]> {
  throw new Error('batchCreate not implemented yet');
}

export function batchDelete(
  _namespaceId: string,
  _ids: string[]
): Promise<void> {
  throw new Error('batchDelete not implemented yet');
}

export function batchMove(
  _namespaceId: string,
  _items: BatchMoveItem[]
): Promise<void> {
  throw new Error('batchMove not implemented yet');
}

export function batchRename(
  _namespaceId: string,
  _items: BatchRenameItem[]
): Promise<void> {
  throw new Error('batchRename not implemented yet');
}
