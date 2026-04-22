import { Resource, ResourceType, SpaceType } from '@/interface';

export type RootResource = Resource & { children?: Resource[] };

export interface TreeNode {
  id: string;
  parentId: string | null;
  spaceType: SpaceType;
  name: string;
  resourceType: ResourceType;
  content?: string;
  attrs?: Record<string, unknown>;
  tags?: import('@/interface').TagDto[];
  path?: import('@/interface').PathItem[];
  hasChildren: boolean;
  currentPermission?: import('@/interface').Permission;
  globalPermission?: import('@/interface').Permission;
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
  uploading: Record<string, boolean>;
  uploadProgress: Record<string, string>;
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

  create: (
    parentId: string,
    type: ResourceType,
    name?: string
  ) => Promise<string>;
  remove: (id: string, currentResourceId?: string) => RemoveResult;
  rename: (id: string, name: string) => Promise<void>;
  move: (dragId: string, dropId: string) => Promise<void>;
  upload: (parentId: string, files: FileList) => Promise<string>;

  activate: (id: string | null) => void;

  expandPathTo: (
    targetId: string,
    options?: { expandTarget?: boolean }
  ) => Promise<void>;
  patch: (
    id: string,
    updates: Partial<Pick<TreeNode, 'name' | 'content'>>
  ) => void;
  refreshChildren: (parentId: string, resources: Resource[]) => void;
  restore: (resourceOrId: Resource | string) => Promise<string>;
  clear: () => void;
}

export type SidebarStore = SidebarState & SidebarActions;
export type SidebarSet = (fn: (draft: SidebarStore) => void) => void;
export type SidebarGet = () => SidebarStore;

export const initialState: SidebarState = {
  namespaceId: '',
  nodes: {},
  ui: {},
  rootIds: { private: '', teamspace: '' },
  activeId: null,
  spaceExpanded: { private: true, teamspace: true },
  uploading: {},
  uploadProgress: {},
};
