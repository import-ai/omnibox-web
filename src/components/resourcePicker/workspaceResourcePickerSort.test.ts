import {
  fetchRootResources,
  type RootResourcesResponse,
} from '@/service/resource';

import {
  fetchSortedWorkspaceRootResources,
  getWorkspacePickerSort,
  setWorkspacePickerSpace,
  type WorkspaceResourceSorts,
} from './workspaceResourcePickerSort';

jest.mock('@/service/resource', () => ({
  fetchRootResources: jest.fn(),
}));

const sorts: WorkspaceResourceSorts = {
  private: { sort_by: 'title', sort_order: 'asc' },
  teamspace: { sort_by: 'manual', sort_order: 'asc' },
};

describe('workspaceResourcePickerSort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and merges roots using each space sort', async () => {
    const privateRoot = { id: 'private-root' };
    const teamRoot = { id: 'team-root' };
    jest.mocked(fetchRootResources).mockResolvedValueOnce({
      private: privateRoot,
      teamspace: teamRoot,
    } as RootResourcesResponse);

    const roots = await fetchSortedWorkspaceRootResources('namespace', sorts);

    expect(fetchRootResources).toHaveBeenCalledTimes(1);
    expect(fetchRootResources).toHaveBeenCalledWith(
      'namespace',
      undefined,
      sorts
    );
    expect(roots).toEqual({ private: privateRoot, teamspace: teamRoot });
  });

  it('propagates the space sort to nested picker resources', () => {
    const resource = setWorkspacePickerSpace(
      {
        id: 'parent',
        parent_id: null,
        resource_type: 'folder',
        children: [
          {
            id: 'child',
            parent_id: 'parent',
            resource_type: 'doc',
          },
        ],
      },
      'teamspace'
    );

    expect(resource.picker_space_type).toBe('teamspace');
    expect(resource.children?.[0].picker_space_type).toBe('teamspace');
    expect(getWorkspacePickerSort(resource.children![0], sorts)).toEqual(
      sorts.teamspace
    );
  });
});
