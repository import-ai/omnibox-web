import type { SidebarActions, SidebarGet, SidebarSet } from '../types';
import { buildBaseActions } from './base';
import { buildCRUDActions } from './crud';
import { buildNavigationActions } from './navigation';
import { buildUploadActions } from './upload';

export function buildActions(set: SidebarSet, get: SidebarGet): SidebarActions {
  return {
    ...buildBaseActions(set, get),
    ...buildCRUDActions(set, get),
    ...buildNavigationActions(set, get),
    ...buildUploadActions(set, get),

    openCreateFolderDialog: (parentId: string) => {
      set(s => {
        s.createFolderTargetId = parentId;
      });
    },

    closeCreateFolderDialog: () => {
      set(s => {
        s.createFolderTargetId = null;
      });
    },

    setCurrentUploadTargetId: (id: string | null) => {
      set(s => {
        s.currentUploadTargetId = id;
      });
    },
  };
}
