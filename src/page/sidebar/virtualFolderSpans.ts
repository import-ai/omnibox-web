import type { FlatResourceRow, FolderSpan } from './virtualResourceTree';
import { folderSpans } from './virtualResourceTree';

interface VirtualListLayout {
  indexes: Record<string, number>;
  spans: FolderSpan[];
}

const layouts = new Map<string, VirtualListLayout>();
const listeners = new Set<() => void>();

function sameLayout(left: VirtualListLayout, right: VirtualListLayout) {
  if (left.spans.length !== right.spans.length) return false;
  for (let index = 0; index < left.spans.length; index += 1) {
    const span = left.spans[index];
    const other = right.spans[index];
    if (
      span.id !== other.id ||
      span.depth !== other.depth ||
      span.start !== other.start ||
      span.end !== other.end
    ) {
      return false;
    }
  }
  const ids = Object.keys(left.indexes);
  if (ids.length !== Object.keys(right.indexes).length) return false;
  return ids.every(id => left.indexes[id] === right.indexes[id]);
}

export function setVirtualFolderLayout(
  listId: string,
  rows: readonly FlatResourceRow[]
) {
  const indexes: Record<string, number> = {};
  rows.forEach((row, index) => {
    if (row.kind === 'node') indexes[row.id] = index;
  });
  const next = { indexes, spans: folderSpans(rows) };
  const current = layouts.get(listId);
  if (current && sameLayout(current, next)) return;
  layouts.set(listId, next);
  listeners.forEach(listener => listener());
}

export function clearVirtualFolderSpans(listId: string) {
  if (!layouts.delete(listId)) return;
  listeners.forEach(listener => listener());
}

export function getVirtualFolderSpans(listId: string) {
  return layouts.get(listId)?.spans ?? [];
}

export function getVirtualRowIndex(listId: string, id: string) {
  return layouts.get(listId)?.indexes[id];
}

export function findVirtualResourcePlacement(id: string) {
  for (const [listId, layout] of layouts) {
    const index = layout.indexes[id];
    if (index !== undefined) return { listId, index };
  }
  return null;
}

export function subscribeVirtualFolderSpans(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
