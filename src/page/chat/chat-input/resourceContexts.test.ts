import type { ResourceMeta } from '@/interface';

import { normalizeResourceContexts } from './resourceContexts';

function resource(id: string, name: string): ResourceMeta {
  return {
    id,
    name,
    parent_id: null,
    resource_type: 'file',
    attrs: { original_name: name },
  };
}

describe('resource contexts', () => {
  it('keeps the first position and latest value for each resource id', () => {
    expect(
      normalizeResourceContexts([
        { type: 'resource', resource: resource('r1', 'old.md') },
        { type: 'resource', resource: resource('r2', 'second.md') },
        { type: 'folder', resource: resource('r1', 'updated.md') },
      ])
    ).toEqual([
      { type: 'folder', resource: resource('r1', 'updated.md') },
      { type: 'resource', resource: resource('r2', 'second.md') },
    ]);
  });
});
