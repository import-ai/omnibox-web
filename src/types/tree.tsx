import { Resource } from '@/types/resource';

export class TreeNode {
  resource: Resource;
  children: TreeNode[];

  constructor(resource: Resource) {
    this.resource = resource;
    this.children = [];
  }

  addChild(child: TreeNode) {
    this.children.push(child);
  }

  removeChild(resourceId: string) {
    this.children = this.children.filter(child => child.resource.id !== resourceId);
  }
}

export class Tree {
  root: TreeNode | null;
  private nodeMap: Map<string, TreeNode>;

  constructor(rootResource: Resource) {
    this.root = new TreeNode(rootResource);
    this.nodeMap = new Map();
    this.nodeMap.set(this.root.resource.id, this.root);
  }

  addNode(resource: Resource, parentId: string) {
    if (!parentId) {
      throw new Error('Parent ID cannot be null or empty');
    }

    const newNode = new TreeNode(resource);
    const parent = this.nodeMap.get(parentId);
    if (parent) {
      parent.addChild(newNode);
      this.nodeMap.set(newNode.resource.id, newNode);
    } else {
      throw new Error('Parent not found');
    }
  }

  findNode(id: string): TreeNode | null {
    return this.nodeMap.get(id) || null;
  }
}