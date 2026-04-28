import type { PathItem } from '@/interface';
import { Permission, Resource, ResourceType, TagDto } from '@/interface';

export type SpaceType = 'share';
export type RootResource = Resource & { children?: Resource[] };

export interface TreeNode {
  id: string;
  parentId: string | null;
  spaceType: SpaceType;
  name: string;
  resourceType: ResourceType;
  content?: string;
  attrs?: Record<string, unknown>;
  tags?: TagDto[];
  path?: PathItem[];
  hasChildren: boolean;
  currentPermission?: Permission;
  globalPermission?: Permission;
  createdAt: string;
  updatedAt: string;
  children: string[];
}

export interface NodeUI {
  expanded: boolean;
  loading: boolean;
  loaded: boolean;
}

export interface SidebarState {
  namespaceId: string;
  nodes: Record<string, TreeNode>;
  ui: Record<string, NodeUI>;
  rootIds: Record<SpaceType, string>;
  activeId: string | null;
  spaceExpanded: Record<SpaceType, boolean>;
  autoExpandedKeys: Record<string, boolean>;
}

export interface RemoveResult {
  nextId: string | null;
  navigateToChat: boolean;
}

export interface SidebarActions {
  setNamespaceId: (id: string) => void;
  init: (roots: Record<string, RootResource>) => void;
  expand: (id: string) => Promise<void>;
  collapse: (id: string) => void;
  toggleSpace: (spaceType: SpaceType, open?: boolean) => void;

  activate: (id: string) => void;

  expandPathTo: (
    targetId: string,
    options?: { expandTarget?: boolean }
  ) => Promise<void>;
  patch: (
    id: string,
    updates: Partial<Pick<TreeNode, 'name' | 'content'>>
  ) => void;
  refreshChildren: (parentId: string, resources: Resource[]) => void;
  clear: () => void;
}

export type SidebarStore = SidebarState & SidebarActions;
export type SidebarSet = (fn: (draft: SidebarStore) => void) => void;
export type SidebarGet = () => SidebarStore;

export const initialState: SidebarState = {
  namespaceId: '',
  nodes: {},
  ui: {},
  rootIds: { share: '' },
  activeId: null,
  spaceExpanded: { share: true },
  autoExpandedKeys: {},
};
