import { FileInfo } from '@/interface';

import { http } from './request';

export async function downloadFile(
  namespaceId: string,
  resourceId: string,
  originalName: string
) {
  try {
    const fileInfo: FileInfo = await http.get(
      `/namespaces/${namespaceId}/resources/${resourceId}/file`,
      { mute: true }
    );
    const link = document.createElement('a');
    link.href = fileInfo.url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error: any) {
    if (error.response?.data?.code === 'file_not_found') {
      await downloadFileOld(namespaceId, resourceId, originalName);
    } else {
      throw error;
    }
  }
}

async function downloadFileOld(
  namespaceId: string,
  resourceId: string,
  originalName: string
) {
  const blob = await http.get(
    `/namespaces/${namespaceId}/resources/files/${resourceId}`,
    {
      responseType: 'blob',
    }
  );
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  if (originalName) {
    link.download = decodeURI(originalName);
  }
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
