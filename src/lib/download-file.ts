import { FileInfo } from '@/interface';

import { http } from './request';

export async function downloadFile(namespaceId: string, resourceId: string) {
  const fileInfo: FileInfo = await http.get(
    `/namespaces/${namespaceId}/resources/${resourceId}/file`
  );
  const link = document.createElement('a');
  link.href = fileInfo.url;
  link.click();
  link.remove();
}
