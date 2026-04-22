export type NotificationFilter = 'all' | 'unread' | 'read';

export interface NotificationItemDto {
  id: string;
  title: string;
  summary: string;
  status: 'unread' | 'read';
  readed_at: string | null;
  tags: string[];
  target: {
    id?: string | number;
    resource_id?: string;
    type: string;
    url?: string;
    target?: string;
  } | null;
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
