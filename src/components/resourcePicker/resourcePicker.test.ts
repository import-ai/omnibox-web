import type { ResourceMeta } from '@/interface';

import {
  getInitialChildrenLoadTargets,
  getInitialExpandedIds,
  shouldAutoExpandSharedRoot,
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
  it('auto expands shared folder roots when they can be browsed', () => {
    expect(
      shouldAutoExpandSharedRoot(resource('folder', 'folder', true), true)
    ).toBe(true);
    expect(
      shouldAutoExpandSharedRoot(resource('file', 'file', false), true)
    ).toBe(false);
    expect(
      shouldAutoExpandSharedRoot(resource('folder', 'folder', true), false)
    ).toBe(false);
  });

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
});
