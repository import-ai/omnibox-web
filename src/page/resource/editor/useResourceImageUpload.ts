import type { UploadFunction } from '@import-ai/omnibox-editor';
import { useCallback } from 'react';

interface UploadedFile {
  name: string;
  link: string;
}

interface UploadResponse {
  namespace_id: string;
  resource_id: string;
  uploaded: UploadedFile[];
  failed: string[];
}

interface UseResourceImageUploadInput {
  linkBase: string;
  namespaceId: string;
  resourceId: string;
}

export function useResourceImageUpload({
  linkBase,
  namespaceId,
  resourceId,
}: UseResourceImageUploadInput) {
  return useCallback<UploadFunction>(
    async (file, onProgress, abortSignal) => {
      const token = localStorage.getItem('token') || '';
      const formData = new FormData();
      formData.append('file[]', file);

      const response = await fetch(
        `/api/v1/namespaces/${namespaceId}/resources/${resourceId}/attachments`,
        {
          method: 'POST',
          headers: {
            'X-Client-Platform': 'web',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
          signal: abortSignal,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = (await response.json()) as UploadResponse;
      const uploaded = data.uploaded[0];
      if (!uploaded) {
        throw new Error(data.failed[0] || 'Upload failed');
      }

      onProgress?.({ progress: 100 });
      return `${linkBase}/attachments/${uploaded.link}`;
    },
    [linkBase, namespaceId, resourceId]
  );
}
