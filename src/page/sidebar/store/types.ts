import {
  PathItem,
  Permission,
  Resource,
  ResourceType,
  SpaceType,
  TagDto,
} from '@/interface';

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

  // UI state
  expanded: boolean;
  loading: boolean;
  loaded: boolean;
  children: string[];
}

export interface SidebarState {
  namespaceId: string;
  nodes: Record<string, TreeNode>;
  rootIds: Record<SpaceType, string>;
  activeId: string | null;
  editingId: string | null;
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
  move: (dragId: string, dropId: string) => void;
  upload: (parentId: string, files: FileList) => Promise<string>;

  activate: (id: string | null) => void;
  setEditingId: (id: string | null) => void;

  expandPathTo: (targetId: string) => Promise<void>;
  patch: (
    id: string,
    updates: Partial<Pick<TreeNode, 'name' | 'content'>>
  ) => void;
  refreshChildren: (parentId: string, resources: Resource[]) => void;
  restore: (resource: Resource) => void;
  clear: () => void;
}

export type SidebarStore = SidebarState & SidebarActions;
export type SidebarSet = (fn: (draft: SidebarStore) => void) => void;
export type SidebarGet = () => SidebarStore;
