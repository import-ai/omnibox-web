import { v4 as uuidv4 } from 'uuid';

export interface SearchPageResponse {
  items: any[];
  total: number | null;
  search_id?: string;
  next_offset?: number;
  has_more?: boolean;
  status?: 'partial' | 'complete';
  recall_truncated?: boolean;
}

export class SearchPageCursor {
  offset = 0;
  searchId?: string;
  private pending?: Record<string, unknown>;

  constructor(private readonly makeRequestId: () => string = uuidv4) {}

  request(payload: Record<string, unknown>, semantic: boolean) {
    if (!this.pending) {
      this.pending = {
        ...payload,
        offset: this.offset,
        ...(semantic
          ? {
              pagination_version: 2,
              request_id: this.makeRequestId(),
              ...(this.searchId ? { search_id: this.searchId } : {}),
            }
          : {}),
      };
    }
    return this.pending;
  }

  accept(page: SearchPageResponse): boolean {
    if (!Array.isArray(page.items)) throw new Error('Invalid search page');
    if (page.search_id !== undefined) {
      if (
        !Number.isInteger(page.next_offset) ||
        page.next_offset! < this.offset ||
        typeof page.has_more !== 'boolean' ||
        (this.searchId && page.search_id !== this.searchId)
      ) {
        throw new Error('Invalid search continuation');
      }
      this.searchId = page.search_id;
      this.offset = page.next_offset!;
    } else {
      this.offset += page.items.length;
    }
    this.pending = undefined;
    return page.has_more ?? this.offset < (page.total ?? this.offset);
  }
}

export function appendSearchItems(current: any[], next: any[]) {
  const seen = new Set(current.map(i => i.resource_id || i.id));
  return [
    ...current,
    ...next.filter(item => {
      const id = item.resource_id || item.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  ];
}
