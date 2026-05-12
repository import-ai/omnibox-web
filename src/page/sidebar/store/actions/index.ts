import type { SidebarActions, SidebarGet, SidebarSet } from '../types';
import { buildBaseActions } from './base';
import { buildCRUDActions } from './crud';
import { buildNavigationActions } from './navigation';
import { buildUploadActions } from './upload';

export function buildActions(set: SidebarSet, get: SidebarGet): SidebarActions {
  return {
    ...buildBaseActions(set),
    ...buildCRUDActions(set, get),
    ...buildNavigationActions(set, get),
    ...buildUploadActions(set, get),

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
  };
}
