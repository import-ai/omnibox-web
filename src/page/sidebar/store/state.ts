import { SidebarState } from './types';

export const initialState: SidebarState = {
  namespaceId: '',
  nodes: {},
  rootIds: { private: '', teamspace: '' },
  activeId: null,
  editingId: null,
  spaceExpanded: { private: true, teamspace: true },
  uploading: {},
  uploadProgress: {},
};
