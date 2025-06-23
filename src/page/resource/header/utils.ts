import { Resource } from '@/interface';

export function sortMenuItems(items: Resource[]): Resource[] {
  const itemMap = new Map<string, Resource>();
  items.forEach((item) => itemMap.set(item.id, item));
  const roots = items.filter((item) => !itemMap.has(item.parent_id));
  const buildTree = (parentId: string): Resource[] => {
    return items
      .filter((item) => item.parent_id === parentId)
      .sort((a, b) => a.id.localeCompare(b.id))
      .flatMap((item) => [item, ...buildTree(item.id)]);
  };
  const sortedItems = roots
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((root) => [root, ...buildTree(root.id)]);

  return sortedItems;
}
