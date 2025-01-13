import {SpaceType, Resource} from '@/types/resource';
import axios from "axios";

export class ResourceTreeNode {
  id: string;
  resource?: Resource;
  children: ResourceTreeNode[];
  isExpanded: boolean;

  constructor(id: string, resource?: Resource) {
    this.id = id;
    this.resource = resource;
    this.children = [];
    this.isExpanded = false;
  }

  addChild(child: ResourceTreeNode) {
    this.children.push(child);
  }

  removeChild(resourceId: string) {
    this.children = this.children.filter(child => child.resource?.id !== resourceId);
  }
}

/**
 * ResourceTree is a tree structure that represents the resources in the system.
 * It is used to manage the resources in the system.
 * It provides methods to add, update, delete, and retrieve resources.
 * It also provides methods to lazy expand and collapse the tree nodes.
 */
export class ResourceTree {
  private readonly baseUrl: string = "/api/v1/resources"
  nodeMap: Map<string, ResourceTreeNode>;
  rootNode: ResourceTreeNode;

  constructor(namespace: string, spaceType: SpaceType) {

    this.nodeMap = new Map();
    this.rootIdMap = new Map();
  }

  put(resource: Resource) {
    const node = this.nodeMap.get(resource.id);
    if (node) {
      if (node.resource?.parentId && node.resource.parentId !== resource.parentId) {
        throw new Error('Parent ID cannot be changed');
      }
      node.resource = resource;
    } else {
      if (!resource.parentId) {
        throw new Error('Parent ID is required');
      }
      const newNode = new ResourceTreeNode(resource.id, resource);
      let parent = this.nodeMap.get(resource.parentId);
      if (!parent) {
        parent = new ResourceTreeNode(resource.parentId);
        this.nodeMap.set(resource.parentId, parent);
      }
      parent.addChild(newNode);
      this.nodeMap.set(resource.id, newNode);
    }
  }

  get(id: string): ResourceTreeNode | null {
    return this.nodeMap.get(id) || null;
  }

  partialUpdateNode(resourceId: string, delta: Partial<Resource>) {
    const node = this.nodeMap.get(resourceId);
    if (node) {
      if (!node.resource) {
        throw new Error('Resource not setted');
      }
      node.resource = {...node.resource, ...delta};
    } else {
      throw new Error('Node not found');
    }
  }

  private deleteNode(node: ResourceTreeNode) {
    node.children.forEach(child => {
      this.deleteNode(child);
    });
    this.nodeMap.delete(node.id);
  }

  delete(id: string) {
    const node = this.nodeMap.get(id);
    if (node) {
      const parent = this.findParentNode(id);
      if (parent) {
        parent.removeChild(node.resource?.id || "");
      }
      this.deleteNode(node);
    } else {
      throw new Error('Node not found');
    }
  }

  expand(id: string) {
    const node = this.nodeMap.get(id);
    if (node) {
      node.isExpanded = true;
    } else {
      axios.get(`${this.baseUrl}/${id}`).then(response => {
        const resource: Resource = response.data;
        this.put(resource);
      });
    }
  }

  private recursiveDelete(node: ResourceTreeNode) {
    node.children.forEach(child => {
      this.recursiveDelete(child);
      this.nodeMap.delete(child.resource?.id || "");
    });
  }

  private findParentNode(id: string): ResourceTreeNode | null {
    const node = this.nodeMap.get(id);
    if (node && node.resource?.parentId) {
      return this.nodeMap.get(node.resource.parentId) || null;
    }
    return null;
  }
}