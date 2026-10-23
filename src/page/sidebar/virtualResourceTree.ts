export const RESOURCE_ROW_HEIGHT = 34;
export const RESOURCE_ROW_OVERSCAN = 8;

export interface VirtualTreeNode {
  children: readonly string[];
  hasChildren: boolean;
}

export type FlatResourceRow =
  | { depth: number; id: string; kind: 'node' }
  | { depth: number; id: string; kind: 'empty'; parentId: string };

export interface FolderSpan {
  depth: number;
  end: number;
  id: string;
  start: number;
}

export function flattenExpandedResources(
  rootIds: readonly string[],
  nodes: Record<string, VirtualTreeNode | undefined>,
  isExpanded: (id: string) => boolean,
  showEmpty: (id: string) => boolean
): FlatResourceRow[] {
  const rows: FlatResourceRow[] = [];

  const walk = (ids: readonly string[], depth: number) => {
    for (const id of ids) {
      const node = nodes[id];
      if (!node) continue;
      rows.push({ kind: 'node', id, depth });
      if (!isExpanded(id) || !node.hasChildren) continue;
      if (node.children.length > 0) {
        walk(node.children, depth + 1);
        continue;
      }
      if (showEmpty(id)) {
        rows.push({
          kind: 'empty',
          id: `${id}:empty`,
          parentId: id,
          depth: depth + 1,
        });
      }
    }
  };

  walk(rootIds, 0);
  return rows;
}

export function visibleRowRange(
  count: number,
  scrollTop: number,
  viewport: number,
  listOffset: number,
  rowHeight = RESOURCE_ROW_HEIGHT,
  overscan = RESOURCE_ROW_OVERSCAN
) {
  if (count <= 0 || rowHeight <= 0) return { start: 0, end: 0 };
  const top = scrollTop - listOffset;
  const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const end = Math.min(
    count,
    Math.ceil((top + Math.max(viewport, 0)) / rowHeight) + overscan
  );
  return { start, end: Math.max(start, end) };
}

/** Expanded folders only: end is the first row after the folder's descendants. */
export function folderSpans(rows: readonly FlatResourceRow[]): FolderSpan[] {
  const spans: FolderSpan[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.kind !== 'node') continue;
    let end = index + 1;
    while (end < rows.length && rows[end].depth > row.depth) end += 1;
    if (end === index + 1) continue;
    spans.push({ id: row.id, depth: row.depth, start: index, end });
  }
  return spans;
}
