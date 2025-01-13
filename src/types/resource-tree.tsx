import {Resource, SpaceType} from '@/types/resource';
import axios from "axios";

export class ResourceTreeNode {
  resource: Resource;
  children: ResourceTreeNode[];
  isExpanded: boolean;

  constructor(resource: Resource) {
    this.resource = resource;
    this.children = [];
    this.isExpanded = false;
  }

  addChild(child: ResourceTreeNode) {
    this.children.push(child);
  }

  removeChild(resourceId: string) {
    this.children = this.children.filter(child => child.resource.id !== resourceId);
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
  rootNode!: ResourceTreeNode;
  namespace: string
  spaceType: SpaceType
  ready: boolean = false;

  constructor(namespace: string, spaceType: SpaceType) {
    this.nodeMap = new Map();
    this.namespace = namespace;
    this.spaceType = spaceType;
  }

  async init() {
    const namespace = this.namespace;
    const spaceType = this.spaceType;
    axios.get(`${this.baseUrl}/root`, {params: {namespace, spaceType}}).then(response => {
      const r: Resource = response.data;
      this.rootNode = new ResourceTreeNode(r);
      this.nodeMap.set(r.id, this.rootNode);

      axios.get(this.baseUrl, {params: {namespace, spaceType}}).then(response => {
        const resources: Resource[] = response.data;
        resources.forEach(resource => {
          this.put(resource);
        });
        this.ready = true;
      })

    })
  }

  async fetch(id: string) {
    const response = await axios.get(`${this.baseUrl}/${id}`)
    const resource: Resource = response.data;
    return this.put(resource);
  }

  async getOrFetch(id: string): Promise<ResourceTreeNode> {
    const node = this.nodeMap.get(id);
    if (node) {
      return node;
    }
    return await this.fetch(id);
  }

  put(resource: Resource) {
    console.log({name: "put", resource});
    let node = this.nodeMap.get(resource.id);
    if (node) {
      if (node.resource.id == this.rootNode.resource.id) {
        throw new Error('Root node cannot be updated');
      }
      if (node.resource.parentId !== resource.parentId) {
        throw new Error('Parent ID cannot be changed');
      }
      node.resource = resource;
    } else {
      node = new ResourceTreeNode(resource);
      this.nodeMap.set(resource.id, node);
    }
    const parent = this.nodeMap.get(resource.parentId);
    if (!parent) {
      console.log({name: "put_error", resource, parent, node});
      throw new Error('Parent node not found');
    }
    if (!parent.children.find(child => child.resource.id === resource.id)) {
      parent.addChild(node);
    }
    return node;
  }

  get(id: string): ResourceTreeNode | null {
    return this.nodeMap.get(id) || null;
  }

  partialUpdateNode(resourceId: string, delta: Partial<Resource>) {
    const node = this.nodeMap.get(resourceId);
    if (node) {
      if (!node.resource) {
        throw new Error('Resource not set');
      }
      node.resource = {...node.resource, ...delta};
    } else {
      throw new Error('Node not found');
    }
  }

  private deleteNode(node: ResourceTreeNode) {
    node.children.forEach(child => this.deleteNode(child));
    this.nodeMap.delete(node.resource.id);
  }

  async delete(id: string) {
    axios.get(`${this.baseUrl}/${id}`).then(() => {
      const node = this.nodeMap.get(id) as ResourceTreeNode;
      const parent = this.nodeMap.get(node.resource.parentId) as ResourceTreeNode;
      parent.removeChild(node.resource?.id || "");
      this.deleteNode(node);
    });
  }

  async expandToggle(id: string) {
    const node = await this.getOrFetch(id);
    if (!node.isExpanded) {
      await this.expand(id);
    } else {
      node.isExpanded = false;
    }
  }

  async expand(id: string, toRoot: boolean = false, cache: boolean = true) {
    const node = await this.getOrFetch(id);
    if (!(node.children.length > 0 && cache)) {
      axios.get(this.baseUrl, {
        params: {
          parentId: id,
          namespace: this.namespace,
          spaceType: this.spaceType,
        }
      }).then(response => {
        const childData: Resource[] = response.data;
        for (const r of childData) {
          this.put(r);
        }
      })
    }
    node.isExpanded = true;
    if (toRoot && node.resource.parentId) {
      await this.expand(node.resource.parentId, true);
    }
  }
}