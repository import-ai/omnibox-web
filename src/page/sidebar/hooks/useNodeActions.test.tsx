/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import {
  getSmartFolderSourceResourceId,
  isSmartFolderChildResource,
} from '@/page/sidebar/components/smart-folder';
import type { TreeNode } from '@/page/sidebar/store/types';

import { useNodeActions, UseNodeActionsReturn } from './useNodeActions';

const navigate = jest.fn();
const fire = jest.fn();
const rename = jest.fn();
let node: TreeNode;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/namespace/folder' }),
  useNavigate: () => navigate,
}));

jest.mock('@/components/ui/Sidebar', () => ({
  useSidebar: () => ({ setOpenMobile: jest.fn() }),
}));

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire }),
}));

jest.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => false,
}));

jest.mock('@/lib/chatBridge', () => ({
  addToChatContext: jest.fn(),
}));

jest.mock('@/lib/deleteResource', () => ({
  deleteResource: jest.fn(),
}));

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn() },
}));

jest.mock('@/page/sidebar/components/smart-folder', () => ({
  getSmartFolderSourceParentId: () => undefined,
  getSmartFolderSourceResourceId: jest.fn(),
  isSmartFolderChildResource: jest.fn(),
}));

jest.mock('@/page/sidebar/store', () => ({
  useNode: () => node,
  useSidebarStore: {
    getState: () => ({ rename }),
  },
}));

jest.mock('@/page/sidebar/utils', () => ({
  triggerGlobalFileUpload: jest.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const folder: TreeNode = {
  id: 'folder',
  parentId: 'private',
  spaceType: 'private',
  name: 'Folder',
  resourceType: 'folder',
  hasChildren: false,
  createdAt: '',
  updatedAt: '',
  children: [],
};

describe('useNodeActions', () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: UseNodeActionsReturn;

  function Probe() {
    current = useNodeActions(node.id, 'namespace');
    return null;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    node = { ...folder };
    jest
      .mocked(getSmartFolderSourceResourceId)
      .mockImplementation((resource: { id: string }) => resource.id);
    jest.mocked(isSmartFolderChildResource).mockReturnValue(false);
    rename.mockResolvedValue(undefined);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('opens the folder dialog and renames without navigating', async () => {
    await act(async () => root.render(<Probe />));
    await act(async () => current.handleEdit());

    expect(current.folderEditOpen).toBe(true);
    expect(navigate).not.toHaveBeenCalled();

    await act(async () => current.handleRenameFolder('Renamed'));

    expect(rename).toHaveBeenCalledWith('folder', 'Renamed');
    expect(fire).toHaveBeenCalledWith('update_resource', {
      id: 'folder',
      name: 'Renamed',
    });
  });

  it('keeps smart folder child folders on the source edit route', async () => {
    node = {
      ...folder,
      id: 'smart-folder-child-smart-folder-source-folder',
      parentId: 'smart-folder',
    };
    jest
      .mocked(getSmartFolderSourceResourceId)
      .mockReturnValue('source-folder');
    jest.mocked(isSmartFolderChildResource).mockReturnValue(true);

    await act(async () => root.render(<Probe />));
    await act(async () => current.handleEdit());

    expect(current.folderEditOpen).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/namespace/source-folder/edit', {
      state: { sidebarActiveKey: node.id },
    });
  });
});
