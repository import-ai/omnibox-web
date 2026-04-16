export type NotificationFilter = 'all' | 'unread' | 'read';

export type NotificationActionType =
  | 'modal_detail'
  | 'current_window'
  | 'new_window'
  | 'toast_only'
  | 'none';

export interface NotificationAction {
  action_type?: NotificationActionType;
  notification_type?: string;
  target_type: string;
  target_id: string | null;
  target_url: string | null;
  target_payload: Record<string, unknown>;
  should_mark_read: boolean;
}

export interface NotificationTarget {
  id?: string | number;
  resource_id?: string;
  type: string;
  url?: string;
  target?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  summary: string;
  status: 'unread' | 'read';
  action: NotificationAction;
  read_at: string | null;
  tags: string[];
  target: NotificationTarget | null;
  attrs: Record<string, unknown>;
  expire_at: string | null;
  created_at: string;
  highlight?: boolean;
}

export interface NotificationApiItem {
  id: string;
  title: string;
  summary: string;
  status: 'unread' | 'read';
  action: NotificationAction;
  read_at: string | null;
  tags: string[];
  target: NotificationTarget | null;
  attrs: Record<string, unknown>;
  expire_at: string | null;
  created_at: string;
}

export interface NotificationDetail {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'unread' | 'read';
  read_at: string | null;
  created_at: string;
}

export type NotificationStatus = 'all' | 'unread' | 'read';

export interface NotificationQueryParams {
  status: NotificationStatus;
  offset: number;
  limit: number;
  tags?: string;
}

export interface NotificationPagination {
  offset: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface NotificationApiResponse {
  list: NotificationApiItem[];
  pagination: NotificationPagination;
}

export interface NotificationUnreadCountResponse {
  unread_count: number;
}

export interface NotificationDetailResponse {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'unread' | 'read';
  read_at: string | null;
  created_at: string;
}
