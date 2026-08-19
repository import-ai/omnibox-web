import { Resource } from '@/interface';
import { http, type RequestConfig } from '@/lib/request';

export function fetchShareChildren(
  shareId: string,
  id: string,
  config?: RequestConfig
) {
  return http.get<Resource[]>(
    `/shares/${shareId}/resources/${id}/children`,
    config
  );
}

export function fetchShareResource(shareId: string, targetId: string) {
  return http.get<Resource>(`/shares/${shareId}/resources/${targetId}`, {
    mute: true,
  });
}
