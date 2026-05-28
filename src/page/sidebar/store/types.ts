import type { PathItem, SpaceType } from '@/interface';
import { Permission, Resource, ResourceType, TagDto } from '@/interface';
import type { CreateSmartFolderPayload } from '@/page/sidebar/components/smart-folder';

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
  editSmartFolder: {
    open: boolean;
    nodeId: string | null;
    initialValue: CreateSmartFolderPayload | null;
  };
  smartFolderTrash: {
    open: boolean;
    nodeId: string | null;
  };
}

export interface SidebarState {
  namespaceId: string;
  nodes: Record<string, TreeNode>;
  ui: Record<string, NodeUI>;
  rootIds: Record<SpaceType, string>;
  activeId: string | null;
  renamingId: string | null;
  dialogs: DialogsState;
  spaceExpanded: Record<SpaceType, boolean>;
  autoExpandedKeys: Record<string, boolean>;
  smartFolderEntitlementsVersion: number;
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
  move: (dragId: string, dropId: string, localOnly?: boolean) => Promise<void>;
  uploadFiles: (parentId: string, files: FileList) => Promise<string>;

  activate: (id: string | null) => void;
  setRenamingId: (id: string | null) => void;
  openCreateFolderDialog: (parentId: string) => void;
  closeCreateFolderDialog: () => void;
  setCurrentUploadTargetId: (id: string | null) => void;
  openEditSmartFolderDialog: (
    nodeId: string,
    initialValue: CreateSmartFolderPayload
  ) => void;
  closeEditSmartFolderDialog: () => void;
  openSmartFolderTrashDialog: (nodeId: string) => void;
  closeSmartFolderTrashDialog: () => void;
  refetchSmartFolderEntitlements: () => void;

  expandPathTo: (
    targetId: string,
    options?: { expandTarget?: boolean }
  ) => Promise<void>;
  patch: (
    id: string,
    updates: Partial<Pick<TreeNode, 'name' | 'content' | 'hasChildren'>>
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
  renamingId: null,
  dialogs: {
    createFolderTargetId: null,
    currentUploadTargetId: null,
    upload: {},
    editSmartFolder: {
      open: false,
      nodeId: null,
      initialValue: null,
    },
    smartFolderTrash: {
      open: false,
      nodeId: null,
    },
  },
  spaceExpanded: { private: true, teamspace: true },
  autoExpandedKeys: {},
  smartFolderEntitlementsVersion: 0,
};
