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

  it('reopens a collapsed folder without starting a second request', async () => {
    let finishLoading: (children: Resource[]) => void = () => undefined;
    mockFetchChildren.mockReturnValue(
      new Promise<Resource[]>(resolve => {
        finishLoading = resolve;
      })
    );

    const loading = useSidebarStore.getState().expand(FOLDER_ID);
    useSidebarStore.getState().collapse(FOLDER_ID);
    const reopened = useSidebarStore.getState().expand(FOLDER_ID);

    expect(useSidebarStore.getState().ui[FOLDER_ID]).toMatchObject({
      expanded: true,
      loading: true,
    });
    expect(mockFetchChildren).toHaveBeenCalledTimes(1);

    finishLoading([]);
    await Promise.all([loading, reopened]);
    expect(useSidebarStore.getState().ui[FOLDER_ID]).toMatchObject({
      expanded: true,
      loading: false,
      loaded: true,
    });
  });

  it('keeps the saved link name while the destination is still loading', async () => {
    let finishLoading: (children: Resource[]) => void = () => undefined;
    mockFetchChildren.mockReturnValue(
      new Promise<Resource[]>(resolve => {
        finishLoading = resolve;
      })
    );
    useSidebarStore.setState({
      nodes: {
        [FOLDER_ID]: { ...folderNode(), resourceType: 'folder' },
      },
      ui: {
        [FOLDER_ID]: { expanded: false, loading: false, loaded: false },
      },
      rootIds: { private: FOLDER_ID, teamspace: '' },
    });

    const loading = useSidebarStore.getState().expand(FOLDER_ID);
    await useSidebarStore.getState().restore({
      id: 'link-1',
      parent_id: FOLDER_ID,
      name: '',
      resource_type: 'link',
      space_type: 'private',
      has_children: false,
      attrs: { url: 'https://v.douyin.com/1vtkpRm_WQU/' },
    } as Resource);

    expect(useSidebarStore.getState().nodes['link-1']?.name).toBe(
      'https://v.douyin.com/1vtkpRm_WQU/'
    );
    expect(useSidebarStore.getState().nodes[FOLDER_ID].children).toContain(
      'link-1'
    );
    expect(mockFetchChildren).toHaveBeenCalledTimes(1);

    useSidebarStore.getState().refreshChildren(FOLDER_ID, []);
    expect(useSidebarStore.getState().nodes['link-1']?.name).toBe(
      'https://v.douyin.com/1vtkpRm_WQU/'
    );
    expect(useSidebarStore.getState().nodes[FOLDER_ID].children).toContain(
      'link-1'
    );

    finishLoading([
      {
        id: 'link-1',
        parent_id: FOLDER_ID,
        name: '',
        resource_type: 'link',
        has_children: false,
        attrs: { url: 'https://v.douyin.com/1vtkpRm_WQU/' },
      } as Resource,
    ]);
    await loading;

    expect(useSidebarStore.getState().nodes['link-1']?.name).toBe(
      'https://v.douyin.com/1vtkpRm_WQU/'
    );
    expect(useSidebarStore.getState().nodes[FOLDER_ID].children).toEqual([
      'link-1',
    ]);
  });
});
