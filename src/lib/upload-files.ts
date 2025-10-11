import SparkMD5 from 'spark-md5';

import { IResourceData } from '@/interface';
import { http } from '@/lib/request';

export function getFileHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const hash = SparkMD5.ArrayBuffer.hash(reader.result as ArrayBuffer);
        resolve(hash);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = e => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

export function uploadFile(
  file: File,
  args: {
    namespaceId: string;
    parentId: string;
  }
): Promise<IResourceData> {
  // If the size is less than 5M, minio will report an error.
  const chunkSize = 5 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / chunkSize);
  if (totalChunks === 1) {
    const formData = new FormData();
    formData.append('parent_id', args.parentId);
    formData.append('namespace_id', args.namespaceId);
    formData.append('file', file);
    formData.append('file_name', encodeURIComponent(file.name));
    return http.post(
      `/namespaces/${args.namespaceId}/resources/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  const chunks: Array<{
    chunk: Blob;
    chunkNumber: number;
  }> = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    chunks.push({
      chunkNumber: i,
      chunk: file.slice(start, end),
    });
  }
  return getFileHash(file).then(async (fileHash: string) => {
    const maxRetries = 3;
    const uploadedChunks: number[] = [];
    for (const item of chunks) {
      let attempt = 0;
      let success = false;
      while (attempt < maxRetries && !success) {
        try {
          const formData = new FormData();
          formData.append('chunk', item.chunk);
          formData.append('file_hash', fileHash);
          formData.append('namespace_id', args.namespaceId);
          formData.append('chunk_number', `${item.chunkNumber}`);
          await http.post(
            `/namespaces/${args.namespaceId}/resources/files/chunk`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );
          uploadedChunks.push(item.chunkNumber);
          success = true;
        } catch (err) {
          attempt++;
          if (attempt >= maxRetries && uploadedChunks.length > 0) {
            await http.post(
              `/namespaces/${args.namespaceId}/resources/files/chunk/clean`,
              {
                file_hash: fileHash,
                namespace_id: args.namespaceId,
                chunks_number: uploadedChunks.join(','),
              }
            );
            throw err;
          }
        }
      }
    }
    return http.post(`/namespaces/${args.namespaceId}/resources/files/merge`, {
      file_hash: fileHash,
      total_chunks: totalChunks,
      file_name: encodeURIComponent(file.name),
      mimetype: file.type,
      parent_id: args.parentId,
      namespace_id: args.namespaceId,
    });
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
    const res = await uploadFile(file, args);
    results.push(res);
  }
  return results;
}
