import { http } from '@/lib/request';

export interface TrashRetentionDaysResponse {
  trash_retention_days?: number;
  trashRetentionDays?: number;
}

export function fetchTrashRetentionDays(
  namespaceId: string,
  signal?: AbortSignal
) {
  return http.get<TrashRetentionDaysResponse>(
    `/namespaces/${namespaceId}/usages/trash-retention-days`,
    {
      signal,
      mute: true,
    }
  );
}
