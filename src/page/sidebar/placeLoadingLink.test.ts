import type { Resource } from '@/interface';

import { placeLoadingLinkInSidebar } from './placeLoadingLink';
import { useSidebarStore } from './store';
import { initialState, type TreeNode } from './store/types';

jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn().mockResolvedValue([]),
  fetchResource: jest.fn(),
  fetchResourcesByIds: jest.fn(),
  fetchSmartFolderChildren: jest.fn(),
  createResource: jest.fn(),
  moveResource: jest.fn(),
  renameResource: jest.fn(),
  restoreResource: jest.fn(),
}));

function folder(): TreeNode {
  return {
    id: 'folder-1',
    parentId: null,
    spaceType: 'private',
    name: 'Folder',
    resourceType: 'folder',
    hasChildren: true,
    readOnly: false,
    createdAt: '',
    updatedAt: '',
    manualSortInitializedAt: null,
    children: ['link-1'],
  };
}

describe('placeLoadingLinkInSidebar', () => {
  beforeEach(() => {
    useSidebarStore.setState({
      ...initialState,
      namespaceId: 'namespace-1',
      nodes: {
        'folder-1': folder(),
        'link-1': {
          ...folder(),
          id: 'link-1',
          parentId: 'folder-1',
          name: '',
          resourceType: 'link',
          hasChildren: false,
          children: [],
        },
      },
      rootIds: { private: 'folder-1', teamspace: '' },
    });
  });

  it('fills an empty sidebar row with the name already shown on the page', () => {
    placeLoadingLinkInSidebar('namespace-1', {
      id: 'link-1',
      parent_id: 'folder-1',
      name: 'https:__v.douyin.com_1vtkpRm_WQU_',
      resource_type: 'link',
      has_children: false,
      space_type: 'private',
      attrs: { url: 'https://v.douyin.com/1vtkpRm_WQU/' },
    } as Resource);

    expect(useSidebarStore.getState().nodes['link-1']?.name).toBe(
      'https:__v.douyin.com_1vtkpRm_WQU_'
    );
  });
});
