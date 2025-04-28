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
  node.children.forEach((item) => {
    nodeMap.set(item.id, {
      ...item,
      children: [],
    });
  });
  node.children.forEach((item) => {
    const currentNode = nodeMap.get(item.id)!;
    const parentId = item.parentId;

    if (parentId === node.id) {
      roots.children.push(currentNode);
    } else {
      const parentNode = nodeMap.get(parentId)!;
      parentNode.children.push(currentNode);
    }
  });

  // 非递归排序实现
  const stack: IResourceData[] = [...roots.children];

  while (stack.length > 0) {
    const currentNode = stack.pop()!;

    currentNode.children = orderBy(
      currentNode.children,
      ['updatedAt'],
      ['desc'],
    );

    stack.push(...currentNode.children);
  }

  // 最后排序根节点
  return {
    ...roots,
    children: orderBy(roots.children, ['updatedAt'], ['desc']),
  };
}
