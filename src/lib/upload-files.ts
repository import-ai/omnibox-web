import { FileInfo, IResourceData } from '@/interface';
import { http } from '@/lib/request';

async function uploadFile(
  namespaceId: string,
  parentId: string,
  file: File
): Promise<IResourceData> {
  const fileInfo: FileInfo = await http.post(
    `/namespaces/${namespaceId}/files`,
    {
      name: file.name,
      mimetype: file.type,
    }
  );
  await fetch(fileInfo.url, {
    method: 'PUT',
    mode: 'cors',
    credentials: 'omit',
    body: file,
  });
  return await http.post(`/namespaces/${namespaceId}/resources`, {
    parentId,
    resourceType: 'file',
    name: file.name,
    file_id: fileInfo.id,
  });
}

export async function uploadFiles(
  files: FileList,
  args: {
    namespaceId: string;
    parentId: string;
  }
): Promise<Array<IResourceData>> {
  const results: IResourceData[] = [];
  for (const file of Array.from(files)) {
    const res = await uploadFile(args.namespaceId, args.parentId, file);
    results.push(res);
  }
  return results;
}
