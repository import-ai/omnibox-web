import type { ResourceMeta } from '@/interface';

import {
  expandAllResourceNodes,
  expandResourceNodesByIds,
  getInitialChildrenLoadTargets,
  getInitialExpandedIds,
  getInitialRootExpansionIds,
  shouldExpandResourceNode,
} from './resourcePickerState';

function resource(
  id: string,
  resourceType: ResourceMeta['resource_type'],
  hasChildren = false
) {
  return {
    id,
    name: id,
    parent_id: null,
    resource_type: resourceType,
    has_children: hasChildren,
  };
}

describe('resource picker defaults', () => {
  it('includes requested root ids in initial expanded ids', () => {
    const roots = [resource('folder', 'folder', true)];

    expect(Array.from(getInitialExpandedIds(roots, ['folder']))).toEqual([
      'folder',
    ]);
  });

  it('loads children for initially expanded roots without bundled children', () => {
    const folder = resource('folder', 'folder', true);
    const file = resource('file', 'file', false);

    expect(
      getInitialChildrenLoadTargets([folder, file], {}, new Set(['folder']))
    ).toEqual([folder]);
  });

  it('treats resources with children as expandable nodes', () => {
    expect(shouldExpandResourceNode(resource('link', 'link', true))).toBe(true);
    expect(shouldExpandResourceNode(resource('file', 'file', false))).toBe(
      false
    );
  });

  it('recursively expands every node with children', async () => {
    const loadChildren = jest.fn(async (node: ReturnType<typeof resource>) => {
      if (node.id === 'root') {
        return [resource('branch', 'link', true), resource('leaf', 'file')];
      }
      if (node.id === 'branch') {
        return [resource('nested', 'doc')];
      }
      return [];
    });

    const result = await expandAllResourceNodes(
      [resource('root', 'folder', true)],
      loadChildren
    );

    expect(Array.from(result.expandedIds)).toEqual(['root', 'branch']);
    expect(result.childrenById.root?.map(item => item.id)).toEqual([
      'branch',
      'leaf',
    ]);
    expect(result.childrenById.branch?.map(item => item.id)).toEqual([
      'nested',
    ]);
    expect(loadChildren).toHaveBeenCalledTimes(2);
  });

  it('reuses provided children cache instead of refetching loaded nodes', async () => {
    const loadChildren = jest.fn(async () => [
      resource('should-not-load', 'file'),
    ]);
    const cachedBranch = resource('branch', 'link', true);
    const cachedLeaf = resource('leaf', 'file');
    const cachedNested = resource('nested', 'doc');

    const result = await expandAllResourceNodes(
      [resource('root', 'folder', true)],
      loadChildren,
      {
        root: [cachedBranch, cachedLeaf],
        branch: [cachedNested],
      }
    );

    expect(loadChildren).not.toHaveBeenCalled();
    expect(Array.from(result.expandedIds)).toEqual(['root', 'branch']);
    expect(result.childrenById.root?.map(item => item.id)).toEqual([
      'branch',
      'leaf',
    ]);
    expect(result.childrenById.branch?.map(item => item.id)).toEqual([
      'nested',
    ]);
  });

  it('continues expanding siblings when one branch fails to load', async () => {
    const loadChildren = jest.fn(async (node: ReturnType<typeof resource>) => {
      if (node.id === 'root') {
        return [resource('bad', 'link', true), resource('good', 'link', true)];
      }
      if (node.id === 'bad') {
        throw new Error('load failed');
      }
      if (node.id === 'good') {
        return [resource('nested', 'doc')];
      }
      return [];
    });

    const result = await expandAllResourceNodes(
      [resource('root', 'folder', true)],
      loadChildren
    );

    expect(Array.from(result.expandedIds)).toEqual(['root', 'good']);
    expect(result.childrenById.good?.map(item => item.id)).toEqual(['nested']);
  });

  it('expands only the requested ancestor path', async () => {
    const loadChildren = jest.fn(async (node: ReturnType<typeof resource>) => {
      if (node.id === 'root') {
        return [
          resource('selected-parent', 'folder', true),
          resource('other-parent', 'folder', true),
        ];
      }
      if (node.id === 'selected-parent') {
        return [resource('selected-resource', 'doc')];
      }
      return [resource('other-resource', 'doc')];
    });

    const result = await expandResourceNodesByIds(
      [resource('root', 'folder', true)],
      ['root', 'selected-parent'],
      loadChildren
    );

    expect(Array.from(result.expandedIds)).toEqual(['root', 'selected-parent']);
    expect(
      result.childrenById['selected-parent']?.map(item => item.id)
    ).toEqual(['selected-resource']);
    expect(result.childrenById['other-parent']).toBeUndefined();
    expect(loadChildren).toHaveBeenCalledTimes(2);
  });

  it('expands requested ancestors without has_children metadata', async () => {
    const root: ResourceMeta = {
      ...resource('root', 'folder'),
      has_children: undefined,
    };
    const parent: ResourceMeta = {
      ...resource('selected-parent', 'folder'),
      has_children: undefined,
    };
    const loadChildren = jest.fn(async (node: ResourceMeta) => {
      if (node.id === 'root') return [parent];
      return [resource('selected-resource', 'doc')];
    });

    const result = await expandResourceNodesByIds(
      [root],
      ['root', 'selected-parent'],
      loadChildren
    );

    expect(Array.from(result.expandedIds)).toEqual(['root', 'selected-parent']);
    expect(loadChildren).toHaveBeenCalledTimes(2);
  });

  it('does not expand unrelated roots while a selected path is unavailable', () => {
    const roots = [
      resource('private-root', 'folder'),
      resource('team-root', 'folder'),
    ];

    expect(getInitialRootExpansionIds(roots, 'selected-resource')).toEqual([]);
    expect(
      getInitialRootExpansionIds(roots, 'selected-resource', [
        { id: 'private-root' },
        { id: 'selected-resource' },
      ])
    ).toEqual(['private-root']);
    expect(getInitialRootExpansionIds(roots, '')).toEqual([
      'private-root',
      'team-root',
    ]);
  });
});
