import { FileInfo, IResourceData } from '@/interface';
import { http } from '@/lib/request';

export interface UploadProgress {
  done: number;
  total: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

async function uploadFile(
  namespaceId: string,
  parentId: string,
  file: File
): Promise<IResourceData> {
  const fileInfo: FileInfo = await http.post(
    `/namespaces/${namespaceId}/resources/files`,
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
    onProgress?: UploadProgressCallback;
  }
): Promise<Array<IResourceData>> {
  const results: IResourceData[] = [];
  const fileArray = Array.from(files);
  const total = fileArray.length;

  args.onProgress?.({
    done: 0,
    total,
  });

  for (let i = 0; i < total; i++) {
    const file = fileArray[i];
    const res = await uploadFile(args.namespaceId, args.parentId, file);
    results.push(res);
    args.onProgress?.({
      done: i + 1,
      total,
    });
  }

  return results;
}
