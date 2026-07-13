import type { ResourceMeta } from '@/interface';

import {
  expandAllResourceNodes,
  getInitialChildrenLoadTargets,
  getInitialExpandedIds,
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
});
