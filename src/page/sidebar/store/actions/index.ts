import type { SidebarActions, SidebarGet, SidebarSet } from '../types';
import { buildBaseActions } from './base';
import { buildBatchActions } from './batch';
import { buildCRUDActions } from './crud';
import { buildNavigationActions } from './navigation';
import { buildUploadActions } from './upload';

export function buildActions(set: SidebarSet, get: SidebarGet): SidebarActions {
  return {
    ...buildBaseActions(set),
    ...buildCRUDActions(set, get),
    ...buildNavigationActions(set, get),
    ...buildUploadActions(set, get),
    ...buildBatchActions(set, get),

    openCreateFolderDialog: (parentId: string) => {
      set(s => {
        s.dialogs.createFolderTargetId = parentId;
      });
    },

    closeCreateFolderDialog: () => {
      set(s => {
        s.dialogs.createFolderTargetId = null;
      });
    },

    setCurrentUploadTargetId: (id: string | null) => {
      set(s => {
        s.dialogs.currentUploadTargetId = id;
      });
    },

    setBatchCreateDialog: (open: boolean) => {
      set(s => {
        s.dialogs.batchCreate = open;
      });
    },

    setBatchMoveDialog: (open: boolean) => {
      set(s => {
        s.dialogs.batchMove = open;
      });
    },

    setBatchDeleteDialog: (open: boolean) => {
      set(s => {
        s.dialogs.batchDelete = open;
      });
    },

    openEditSmartFolderDialog: (nodeId, initialValue) => {
      set(s => {
        s.dialogs.editSmartFolder = {
          open: true,
          nodeId,
          initialValue,
        };
      });
    },

    closeEditSmartFolderDialog: () => {
      set(s => {
        s.dialogs.editSmartFolder.open = false;
        s.dialogs.editSmartFolder.nodeId = null;
        s.dialogs.editSmartFolder.initialValue = null;
      });
    },

    openSmartFolderTrashDialog: nodeId => {
      set(s => {
        s.dialogs.smartFolderTrash = {
          open: true,
          nodeId,
        };
      });
    },

    closeSmartFolderTrashDialog: () => {
      set(s => {
        s.dialogs.smartFolderTrash.open = false;
        s.dialogs.smartFolderTrash.nodeId = null;
      });
    },

    refetchSmartFolderEntitlements: () => {
      set(s => {
        s.smartFolderEntitlementsVersion += 1;
      });
    },
  };
}
