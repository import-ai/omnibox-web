import { Resource } from '@/interface';
import { http } from '@/lib/request';

export function fetchShareChildren(shareId: string, id: string) {
  return http.get<Resource[]>(`/shares/${shareId}/resources/${id}/children`);
}

export function fetchShareResource(shareId: string, targetId: string) {
  return http.get<Resource>(`/shares/${shareId}/resources/${targetId}`, {
    mute: true,
  });
}

export function fetchShareResourcesByIds(shareId: string, ids: string[]) {
  return http.get<Resource[]>(
    `/shares/${shareId}/resources?id=${ids.join(',')}`
  );
}
