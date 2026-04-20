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

export interface NotificationItemDto {
  id: string;
  title: string;
  summary: string;
  status: 'unread' | 'read';
  action: NotificationAction;
  readed_at: string | null;
  tags: string[];
  target: NotificationTarget | null;
  attrs: Record<string, unknown>;
  created_at: string;
}

export interface NotificationItem extends NotificationItemDto {
  highlight?: boolean;
}

export interface NotificationDetailDto {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'unread' | 'read';
  readed_at: string | null;
  created_at: string;
}

export interface NotificationDetail extends NotificationDetailDto {}

export type NotificationStatus = 'all' | 'unread' | 'read';

export interface NotificationQueryParams {
  status: NotificationStatus;
  offset: number;
  limit: number;
  tags?: string;
}

export interface NotificationPaginationDto {
  offset: number;
  limit: number;
  total: number;
}

export interface NotificationListDto {
  list: NotificationItemDto[];
  pagination: NotificationPaginationDto;
}

export interface NotificationUnreadCountDto {
  unread_count: number;
}
