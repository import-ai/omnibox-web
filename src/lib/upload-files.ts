import SparkMD5 from 'spark-md5';
import { http } from '@/lib/request';
import { IResourceData } from '@/interface';

export function getFileHash(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(SparkMD5.hash(reader.result as string));
    };
    reader.readAsText(file);
  });
}

export function uploadFile(
  file: File,
  args: {
    namespaceId: string;
    parentId: string;
  },
): Promise<IResourceData> {
  // If the size is less than 5M, minio will report an error.
  const chunkSize = 5 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / chunkSize);
  if (totalChunks === 1) {
    const formData = new FormData();
    formData.append('parent_id', args.parentId);
    formData.append('namespace_id', args.namespaceId);
    formData.append('file', file);
    return http.post(
      `/namespaces/${args.namespaceId}/resources/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
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
  return getFileHash(file).then((fileHash: string) => {
    return Promise.all(
      chunks.map((item) => {
        const formData = new FormData();
        formData.append('chunk', item.chunk);
        formData.append('file_hash', fileHash);
        formData.append('namespace_id', args.namespaceId);
        formData.append('chunk_number', `${item.chunkNumber}`);
        return http.post(
          `/namespaces/${args.namespaceId}/resources/files/chunk`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        );
      }),
    )
      .then(() => {
        return http.post(
          `/namespaces/${args.namespaceId}/resources/files/merge`,
          {
            file_hash: fileHash,
            total_chunks: totalChunks,
            file_name: file.name,
            mimetype: file.type,
            parent_id: args.parentId,
            namespace_id: args.namespaceId,
          },
        );
      })
      .catch((err) => {
        return http
          .post(`/namespaces/${args.namespaceId}/resources/files/chunk/clean`, {
            file_hash: fileHash,
            namespace_id: args.namespaceId,
            chunks_number: chunks.map((chunk) => chunk.chunkNumber).join(','),
          })
          .finally(() => Promise.reject(err));
      });
  });
}

export function uploadFiles(
  files: FileList,
  args: {
    namespaceId: string;
    parentId: string;
  },
): Promise<Array<IResourceData>> {
  return Promise.all(Array.from(files).map((file) => uploadFile(file, args)));
}
