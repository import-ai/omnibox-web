import { ResourceType } from '@/interface';

export interface TrashItem {
  id: string;
  parent_id: string | null;
  name: string;
  resource_type: ResourceType;
  attrs: Record<string, any>;
  deleted_at: string;
}

export interface TrashListResponse {
  items: TrashItem[];
  total: number;
  limit: number;
  offset: number;
}
