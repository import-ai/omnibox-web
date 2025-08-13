import { orderBy } from 'lodash-es';

import { IResourceData } from '@/interface';

export default function group(node: IResourceData) {
  if (!node) {
    return {};
  }

  const roots: IResourceData = {
    ...node,
    children: [],
  };
  const nodeMap = new Map<string | number, IResourceData>();
  node.children.forEach(item => {
    nodeMap.set(item.id, {
      ...item,
      children: [],
    });
  });
  node.children.forEach(item => {
    const currentNode = nodeMap.get(item.id)!;
    const parent_id = item.parent_id;
    if (parent_id === node.id) {
      roots.children.push(currentNode);
    } else {
      const parentNode = nodeMap.get(parent_id)!;
      parentNode.children.push(currentNode);
    }
  });

  // Non-recursive sorting implementation
  const stack: IResourceData[] = [...roots.children];

  while (stack.length > 0) {
    const currentNode = stack.pop()!;

    currentNode.children = orderBy(
      currentNode.children,
      ['updated_at'],
      ['desc']
    );

    stack.push(...currentNode.children);
  }

  // Finally, sort the root nodes
  return {
    ...roots,
    children: orderBy(roots.children, ['updated_at'], ['desc']),
  };
}
