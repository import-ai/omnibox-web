import type { Resource } from '@/interface';
import { fetchChildren } from '@/service/resource';

import { useSidebarStore } from '..';
import { initialState, type TreeNode } from '../types';

jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn(),
  fetchResource: jest.fn(),
  fetchResourcesByIds: jest.fn(),
  fetchSmartFolderChildren: jest.fn(),
}));

const mockFetchChildren = fetchChildren as jest.Mock;
const FOLDER_ID = 'folder-1';

function folderNode(): TreeNode {
  return {
    id: FOLDER_ID,
    parentId: null,
    spaceType: 'private',
    name: 'Folder',
    resourceType: 'rss_folder',
    hasChildren: true,
    readOnly: false,
    createdAt: '',
    updatedAt: '',
    manualSortInitializedAt: null,
    children: [],
  };
}

describe('sidebar navigation actions', () => {
  beforeEach(() => {
    mockFetchChildren.mockReset();
    useSidebarStore.setState({
      ...initialState,
      namespaceId: 'namespace-1',
      nodes: { [FOLDER_ID]: folderNode() },
      ui: {
        [FOLDER_ID]: { expanded: false, loading: false, loaded: false },
      },
    });
  });

  it('keeps a folder collapsed when loading finishes after the user closes it', async () => {
    let finishLoading: (children: Resource[]) => void = () => undefined;
    mockFetchChildren.mockReturnValue(
      new Promise<Resource[]>(resolve => {
        finishLoading = resolve;
      })
    );

    const loading = useSidebarStore.getState().expand(FOLDER_ID);
    expect(useSidebarStore.getState().ui[FOLDER_ID]).toMatchObject({
      expanded: true,
      loading: true,
    });

    useSidebarStore.getState().collapse(FOLDER_ID);
    finishLoading([]);
    await loading;

    expect(useSidebarStore.getState().ui[FOLDER_ID]).toMatchObject({
      expanded: false,
      loading: false,
      loaded: true,
    });
  });
});
