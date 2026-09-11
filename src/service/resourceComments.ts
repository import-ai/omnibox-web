import { API_BASE_URL } from '@/const';
import type { ResourceCommentThread } from '@/interface';
import { http } from '@/lib/request';

export interface ResourceCommentAnchorPayload {
  thread_id: string;
  from: number;
  to: number;
  quoted_text: string;
  prefix?: string;
  suffix?: string;
}

export interface ResourceCommentThreadList {
  items: ResourceCommentThread[];
  total: number;
  offlet: number;
  limits: number;
  has_more: boolean;
}

export interface ResourceCommentAttachmentUpload {
  id: string;
  url: string;
  name: string;
  mimetype: string;
  size: number;
}

export interface CreateResourceCommentThreadPayload {
  quoted_text: string;
  anchor_from: number;
  anchor_to: number;
  anchor_prefix?: string;
  anchor_suffix?: string;
  expected_content_hash: string;
  content?: string;
  attachment_ids?: string[];
}

export interface CreateResourceCommentPayload {
  content?: string;
  attachment_ids?: string[];
}

export interface CreateResourceCommentThreadResponse {
  thread: ResourceCommentThread;
  thread_created: boolean;
  comment_created: true;
}

function threadsUrl(namespaceId: string, resourceId: string) {
  if (namespaceId.startsWith('share:')) {
    return `/shares/${namespaceId.slice(6)}/resources/${resourceId}/comment-threads`;
  }
  return `/namespaces/${namespaceId}/resources/${resourceId}/comment-threads`;
}

export function listResourceCommentThreads(
  namespaceId: string,
  resourceId: string,
  options: { offlet?: number; limits?: number; resolved?: boolean } = {}
) {
  return http.get<ResourceCommentThreadList>(
    threadsUrl(namespaceId, resourceId),
    {
      params: {
        offlet: options.offlet ?? 0,
        limits: options.limits ?? 20,
        ...(options.resolved === undefined
          ? {}
          : { resolved: String(options.resolved) }),
      },
    }
  ) as Promise<ResourceCommentThreadList>;
}

export function createResourceCommentThread(
  namespaceId: string,
  resourceId: string,
  payload: CreateResourceCommentThreadPayload
) {
  return http.post<CreateResourceCommentThreadResponse>(
    threadsUrl(namespaceId, resourceId),
    payload,
    { muteCodes: ['resource_content_conflict'] }
  ) as Promise<CreateResourceCommentThreadResponse>;
}

function commentAttachmentsUrl(namespaceId: string, resourceId: string) {
  return `/namespaces/${namespaceId}/resources/${resourceId}/comment-attachments`;
}

export async function uploadResourceCommentAttachment(
  namespaceId: string,
  resourceId: string,
  file: File
) {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('token') || '';
  const headers: Record<string, string> = { From: 'web' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(
    `${API_BASE_URL}${commentAttachmentsUrl(namespaceId, resourceId)}`,
    {
      method: 'POST',
      headers,
      body: formData,
    }
  );
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  return (await response.json()) as ResourceCommentAttachmentUpload;
}

export function createResourceComment(
  namespaceId: string,
  resourceId: string,
  threadId: string,
  payload: CreateResourceCommentPayload
) {
  return http.post<ResourceCommentThread>(
    `${threadsUrl(namespaceId, resourceId)}/${threadId}/comments`,
    payload
  ) as Promise<ResourceCommentThread>;
}

export function updateResourceCommentThread(
  namespaceId: string,
  resourceId: string,
  threadId: string,
  resolved: boolean
) {
  return http.patch<ResourceCommentThread>(
    `${threadsUrl(namespaceId, resourceId)}/${threadId}`,
    { resolved }
  ) as Promise<ResourceCommentThread>;
}

export function updateResourceComment(
  namespaceId: string,
  resourceId: string,
  threadId: string,
  commentId: string,
  payload: { content?: string; attachment_ids?: string[] }
) {
  return http.patch<ResourceCommentThread>(
    `${threadsUrl(namespaceId, resourceId)}/${threadId}/comments/${commentId}`,
    payload
  ) as Promise<ResourceCommentThread>;
}

export function deleteResourceCommentThread(
  namespaceId: string,
  resourceId: string,
  threadId: string
) {
  return http.delete<void>(
    `${threadsUrl(namespaceId, resourceId)}/${threadId}`
  ) as Promise<void>;
}

export function deleteResourceComment(
  namespaceId: string,
  resourceId: string,
  threadId: string,
  commentId: string
) {
  return http.delete<ResourceCommentThread | null>(
    `${threadsUrl(namespaceId, resourceId)}/${threadId}/comments/${commentId}`
  ) as Promise<ResourceCommentThread | null>;
}
