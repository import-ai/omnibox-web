import type { PathItem, SpaceType } from '@/interface';
import { Permission, Resource, ResourceType, TagDto } from '@/interface';
import type { CreateRssFolderPayload } from '@/page/sidebar/components/rss-folder';
import type { CreateSmartFolderPayload } from '@/page/sidebar/components/smart-folder';
import type { ResourceSortOptions } from '@/service/resource';

import type { ResourceSorts } from './resourceSort';

export type RootResource = Resource & { children?: Resource[] };
export type ManualDropPosition = 'before' | 'inside' | 'after';

export interface PendingManualDrop {
  dragId: string;
  targetId: string;
  position: ManualDropPosition;
}

export interface ManualDropIndicator {
  targetId: string;
  position: ManualDropPosition;
  line: {
    left: number;
    top: number;
    width: number;
  } | null;
}

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
  /** Backend-managed resource (rss item): no rename, move, delete or drag. */
  readOnly: boolean;
  currentPermission?: Permission;
  globalPermission?: Permission;
  createdAt: string;
  updatedAt: string;
  manualSortInitializedAt: string | null;
  children: string[];
}

export interface NodeUI {
  expanded: boolean;
  loading: boolean;
  loaded: boolean;
}

export interface DialogsState {
  createFolderTargetId: string | null;
  createRssFolderTargetId: string | null;
  currentUploadTargetId: string | null;
  upload: Record<string, string>;
  batchCreate: boolean;
  batchMove: boolean;
  batchDelete: boolean;
  editSmartFolder: {
    open: boolean;
    nodeId: string | null;
    initialValue: CreateSmartFolderPayload | null;
  };
  editRssFolder: {
    open: boolean;
    nodeId: string | null;
    initialValue: CreateRssFolderPayload | null;
  };
  smartFolderTrash: {
    open: boolean;
    nodeId: string | null;
  };
  pendingManualDrop: PendingManualDrop | null;
}

export interface BatchOperationResult {
  success: string[];
  failed: Array<{ id: string; error: Error }>;
  nameConflictIds?: string[];
  /** i18n key explaining why the selection was refused, if it was. */
  unsupportedTipKey?: string;
  resourceId?: string;
  nextId?: string | null;
  navigateToChat?: boolean;
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
  selectedIds: Record<string, boolean>;
  selectionMode: boolean;
  lastSelectedId: string | null;
  batchDragging: boolean;
  smartFolderEntitlementsVersion: number;
  rssFolderLimitsVersion: number;
  resourceSorts: ResourceSorts;
  manualDropIndicator: ManualDropIndicator | null;
}

export interface RemoveResult {
  nextId: string | null;
  navigateToChat: boolean;
}

export interface SidebarActions {
  setNamespaceId: (id: string) => void;
  setResourceSort: (spaceType: SpaceType, sort: ResourceSortOptions) => void;
  setResourceSorts: (sorts: ResourceSorts) => void;
  setPendingManualDrop: (drop: PendingManualDrop | null) => void;
  setManualDropIndicator: (indicator: ManualDropIndicator | null) => void;
  applyManualDrop: (
    drop: PendingManualDrop,
    onSortSyncFailure?: () => void
  ) => Promise<void>;
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
  openCreateRssFolderDialog: (parentId: string) => void;
  closeCreateRssFolderDialog: () => void;
  setCurrentUploadTargetId: (id: string | null) => void;
  setBatchCreateDialog: (open: boolean) => void;
  setBatchMoveDialog: (open: boolean) => void;
  setBatchDeleteDialog: (open: boolean) => void;
  openEditSmartFolderDialog: (
    nodeId: string,
    initialValue: CreateSmartFolderPayload
  ) => void;
  closeEditSmartFolderDialog: () => void;
  openEditRssFolderDialog: (
    nodeId: string,
    initialValue: CreateRssFolderPayload
  ) => void;
  closeEditRssFolderDialog: () => void;
  openSmartFolderTrashDialog: (nodeId: string) => void;
  closeSmartFolderTrashDialog: () => void;
  refetchSmartFolderEntitlements: () => void;
  refetchRssFolderLimits: () => void;

  expandPathTo: (
    targetId: string,
    options?: { expandTarget?: boolean }
  ) => Promise<void>;
  patch: (
    id: string,
    updates: Partial<
      Pick<
        TreeNode,
        'name' | 'content' | 'hasChildren' | 'manualSortInitializedAt'
      >
    >
  ) => void;
  refreshChildren: (parentId: string, resources: Resource[]) => void;
  restore: (resourceOrId: Resource | string) => Promise<string>;
  clear: () => void;

  toggleSelection: (id: string, rangeStartId?: string) => void;
  selectAll: (spaceType?: SpaceType) => void;
  deselectAll: () => void;
  clearSelection: () => void;
  setSelectionMode: (enabled: boolean) => void;
  setBatchDragging: (dragging: boolean) => void;
  batchRemove: (
    ids: string[],
    currentResourceId?: string
  ) => Promise<BatchOperationResult>;
  batchMove: (ids: string[], targetId: string) => Promise<BatchOperationResult>;
  batchCreate: (
    folderName: string,
    parentId: string
  ) => Promise<BatchOperationResult>;
  addToChat: (ids: string[]) => string[];
}

export type SidebarStore = SidebarState & SidebarActions;
export type SidebarSet = (fn: (draft: SidebarStore) => void) => void;
export type SidebarGet = () => SidebarStore;

export const initialDialogsState: DialogsState = {
  createFolderTargetId: null,
  createRssFolderTargetId: null,
  currentUploadTargetId: null,
  upload: {},
  batchCreate: false,
  batchMove: false,
  batchDelete: false,
  editSmartFolder: {
    open: false,
    nodeId: null,
    initialValue: null,
  },
  editRssFolder: {
    open: false,
    nodeId: null,
    initialValue: null,
  },
  smartFolderTrash: {
    open: false,
    nodeId: null,
  },
  pendingManualDrop: null,
};

export const initialState: SidebarState = {
  namespaceId: '',
  nodes: {},
  ui: {},
  rootIds: { private: '', teamspace: '' },
  activeId: null,
  renamingId: null,
  dialogs: initialDialogsState,
  spaceExpanded: { private: true, teamspace: true },
  autoExpandedKeys: {},
  selectedIds: {},
  selectionMode: false,
  lastSelectedId: null,
  batchDragging: false,
  smartFolderEntitlementsVersion: 0,
  rssFolderLimitsVersion: 0,
  resourceSorts: {
    private: { sort_by: 'updated_at', sort_order: 'desc' },
    teamspace: { sort_by: 'updated_at', sort_order: 'desc' },
  },
  manualDropIndicator: null,
};
