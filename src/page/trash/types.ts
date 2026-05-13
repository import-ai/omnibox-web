import { ResourceMeta } from '@/interface';

export interface TrashItem extends ResourceMeta {
  deleted_at: string;
  disable_restore?: boolean;
}

export interface TrashListResponse {
  items: TrashItem[];
  total: number;
  limit: number;
  offset: number;
  trash_retention_days: number | null;
}
