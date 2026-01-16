import { http } from '@/lib/request';

export interface ExportProgress {
  phase: 'fetching' | 'processing' | 'downloading' | 'complete' | 'error';
  current: number;
  total: number;
  currentItem?: string;
  error?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

export interface ExportJobResponse {
  id: string;
  namespace_id: string;
  resource_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';
  total_resources: number;
  processed_resources: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
}

export interface ExportDownloadResponse {
  download_url: string;
  expires_at: string;
}

const POLL_INTERVAL = 1500;
const MAX_POLL_DURATION_MS = 60 * 60 * 1000;

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;

function sanitizeDownloadName(name: string): string {
  const sanitized = (name || '')
    .replace(INVALID_FILENAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim();
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return 'export';
  }
  return sanitized;
}

function ensureZipExtension(name: string): string {
  if (name.toLowerCase().endsWith('.zip')) {
    return name;
  }
  return `${name}.zip`;
}

async function pollJobStatus(
  namespaceId: string,
  jobId: string,
  onProgress?: ExportProgressCallback,
  abortSignal?: AbortSignal
): Promise<ExportDownloadResponse> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MAX_POLL_DURATION_MS) {
    if (abortSignal?.aborted) {
      try {
        await http.delete(`/namespaces/${namespaceId}/exports/${jobId}`, {
          mute: true,
        });
      } catch {
        // ignore cancel errors
      }
      throw new DOMException('Aborted', 'AbortError');
    }

    const job: ExportJobResponse = await http.get(
      `/namespaces/${namespaceId}/exports/${jobId}`,
      { mute: true }
    );

    const total = job.total_resources || 0;
    const current = job.processed_resources || 0;

    if (onProgress) {
      let phase: ExportProgress['phase'] = 'processing';
      if (job.status === 'pending') {
        phase = 'fetching';
      } else if (job.status === 'completed') {
        phase = 'downloading';
      } else if (job.status === 'canceled') {
        phase = 'error';
      }
      onProgress({
        phase,
        status: job.status,
        current,
        total,
      });
    }

    if (job.status === 'completed') {
      const downloadResponse: ExportDownloadResponse = await http.get(
        `/namespaces/${namespaceId}/exports/${jobId}/download`,
        { mute: true }
      );
      return downloadResponse;
    }

    if (job.status === 'failed') {
      throw new Error(job.error_message || 'Export failed');
    }
    if (job.status === 'canceled') {
      throw new Error(job.error_message || 'EXPORT_CANCELED');
    }

    const waitMs = job.status === 'pending' ? POLL_INTERVAL * 2 : POLL_INTERVAL;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  throw new Error('EXPORT_TIMEOUT');
}

export async function exportAllAsZipBackend(
  namespaceId: string,
  resourceId: string,
  folderName: string,
  onProgress?: ExportProgressCallback,
  abortSignal?: AbortSignal
): Promise<void> {
  try {
    if (onProgress) {
      onProgress({
        phase: 'fetching',
        current: 0,
        total: 0,
      });
    }

    const job: ExportJobResponse = await http.post(
      `/namespaces/${namespaceId}/resources/${resourceId}/export`,
      {},
      { mute: true }
    );

    if (abortSignal?.aborted) {
      try {
        await http.delete(`/namespaces/${namespaceId}/exports/${job.id}`, {
          mute: true,
        });
      } catch {
        // ignore cancel errors
      }
      throw new DOMException('Aborted', 'AbortError');
    }

    const downloadResponse = await pollJobStatus(
      namespaceId,
      job.id,
      onProgress,
      abortSignal
    );

    if (onProgress) {
      onProgress({
        phase: 'downloading',
        current: 0,
        total: 0,
      });
    }

    const link = document.createElement('a');
    link.href = downloadResponse.download_url;
    const safeName = ensureZipExtension(sanitizeDownloadName(folderName));
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onProgress) {
      onProgress({
        phase: 'complete',
        current: 1,
        total: 1,
      });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    if (onProgress) {
      onProgress({
        phase: 'error',
        current: 0,
        total: 0,
        error: error instanceof Error ? error.message : 'Export failed',
      });
    }
    throw error;
  }
}
