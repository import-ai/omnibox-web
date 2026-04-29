import type { PathItem, SpaceType } from '@/interface';
import { Permission, Resource, ResourceType, TagDto } from '@/interface';

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

export interface DialogsState {
  createFolderTargetId: string | null;
  currentUploadTargetId: string | null;
  upload: Record<string, string>;
}

export interface BatchOperationResult {
  success: string[];
  failed: Array<{ id: string; error: Error }>;
}

export interface SidebarState {
  namespaceId: string;
  nodes: Record<string, TreeNode>;
  ui: Record<string, NodeUI>;
  rootIds: Record<SpaceType, string>;
  activeId: string | null;
  dialogs: DialogsState;
  spaceExpanded: Record<SpaceType, boolean>;
  autoExpandedKeys: Record<string, boolean>;
  selectedIds: Record<string, boolean>;
  selectionMode: boolean;
  lastSelectedId: string | null;
  failedIds: Record<string, boolean>;
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
  uploadFiles: (parentId: string, files: FileList) => Promise<string>;

  activate: (id: string | null) => void;
  openCreateFolderDialog: (parentId: string) => void;
  closeCreateFolderDialog: () => void;
  setCurrentUploadTargetId: (id: string | null) => void;

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

  toggleSelection: (id: string, rangeStartId?: string) => void;
  selectAll: (spaceType?: SpaceType) => void;
  deselectAll: () => void;
  setSelectionMode: (enabled: boolean) => void;
  batchRemove: (ids: string[]) => Promise<BatchOperationResult>;
  batchMove: (ids: string[], targetId: string) => Promise<BatchOperationResult>;
  batchRefresh: (ids: string[]) => Promise<BatchOperationResult>;
  batchCreate: (
    folderName: string,
    targetSpaceType: SpaceType
  ) => Promise<BatchOperationResult>;
  addToChat: (ids: string[]) => void;
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
  dialogs: {
    createFolderTargetId: null,
    currentUploadTargetId: null,
    upload: {},
  },
  spaceExpanded: { private: true, teamspace: true },
  autoExpandedKeys: {},
  selectedIds: {},
  selectionMode: false,
  lastSelectedId: null,
  failedIds: {},
};
