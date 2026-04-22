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

export const sidebarApi = {
  fetchChildren: (namespaceId: string, id: string) =>
    http.get<Resource[]>(`/namespaces/${namespaceId}/resources/${id}/children`),

  create: (namespaceId: string, payload: CreatePayload) =>
    http.post<Resource>(`/namespaces/${namespaceId}/resources`, payload),

  delete: (namespaceId: string, id: string) =>
    http.delete(`/namespaces/${namespaceId}/resources/${id}`),

  rename: (namespaceId: string, id: string, name: string) =>
    http.patch(`/namespaces/${namespaceId}/resources/${id}`, { name }),

  move: (namespaceId: string, dragId: string, dropId: string) =>
    http.post(`/namespaces/${namespaceId}/resources/${dragId}/move/${dropId}`),

  fetchResource: (namespaceId: string, targetId: string) =>
    http.get<Resource>(`/namespaces/${namespaceId}/resources/${targetId}`, {
      mute: true,
    }),

  fetchResourcesByIds: (namespaceId: string, ids: string[]) =>
    http.get<Resource[]>(
      `/namespaces/${namespaceId}/resources?id=${ids.join(',')}`
    ),

  restore: (namespaceId: string, id: string) =>
    http.post<Resource>(`/namespaces/${namespaceId}/resources/${id}/restore`),

  upload: (
    files: FileList,
    options: {
      parentId: string;
      namespaceId: string;
      onProgress?: (progress: { done: number; total: number }) => void;
    }
  ) => uploadFiles(files, options),

  batchCreate: (
    _namespaceId: string,
    _items: BatchCreateItem[]
  ): Promise<Resource[]> => {
    throw new Error('batchCreate not implemented yet');
  },

  batchDelete: (_namespaceId: string, _ids: string[]): Promise<void> => {
    throw new Error('batchDelete not implemented yet');
  },

  batchMove: (_namespaceId: string, _items: BatchMoveItem[]): Promise<void> => {
    throw new Error('batchMove not implemented yet');
  },

  batchRename: (
    _namespaceId: string,
    _items: BatchRenameItem[]
  ): Promise<void> => {
    throw new Error('batchRename not implemented yet');
  },
};
