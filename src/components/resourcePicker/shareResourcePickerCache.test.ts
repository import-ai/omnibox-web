import type { TreeNode } from '@/page/share/sidebar/store/types';

import {
  buildShareResourcePickerChildrenById,
  getShareSidebarLoadedChildren,
  treeNodeToPickerResource,
} from './shareResourcePickerCache';

function node(id: string, overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    id,
    parentId: null,
    spaceType: 'share',
    name: id,
    resourceType: 'folder',
    hasChildren: false,
    createdAt: '',
    updatedAt: '',
    children: [],
    ...overrides,
  };
}

describe('shareResourcePickerCache', () => {
  it('converts sidebar tree nodes into picker resources', () => {
    expect(
      treeNodeToPickerResource(
        node('folder', {
          name: 'Docs',
          parentId: 'root',
          resourceType: 'folder',
          hasChildren: true,
          attrs: { original_name: 'Docs' },
        })
      )
    ).toEqual({
      id: 'folder',
      name: 'Docs',
      parent_id: 'root',
      resource_type: 'folder',
      attrs: { original_name: 'Docs' },
      has_children: true,
      created_at: undefined,
      updated_at: undefined,
    });
  });

  it('builds children cache only from loaded sidebar nodes for the same share', () => {
    const root = node('root', {
      hasChildren: true,
      children: ['folder', 'file'],
    });
    const folder = node('folder', {
      parentId: 'root',
      hasChildren: true,
      children: ['nested'],
    });
    const file = node('file', {
      parentId: 'root',
      resourceType: 'file',
    });
    const nested = node('nested', {
      parentId: 'folder',
      resourceType: 'doc',
    });
    const unloaded = node('unloaded', {
      parentId: 'folder',
      hasChildren: true,
      children: ['missing-child'],
    });

    const childrenById = buildShareResourcePickerChildrenById(
      {
        namespaceId: 'share-1',
        nodes: { root, folder, file, nested, unloaded },
        ui: {
          root: { expanded: true, loading: false, loaded: true },
          folder: { expanded: true, loading: false, loaded: true },
          file: { expanded: false, loading: false, loaded: false },
          nested: { expanded: false, loading: false, loaded: false },
          unloaded: { expanded: false, loading: false, loaded: false },
        },
      },
      'share-1'
    );

    expect(Object.keys(childrenById).sort()).toEqual(['folder', 'root']);
    expect(childrenById.root?.map(item => item.id)).toEqual(['folder', 'file']);
    expect(childrenById.folder?.map(item => item.id)).toEqual(['nested']);
  });

  it('ignores sidebar cache from a different share id', () => {
    expect(
      buildShareResourcePickerChildrenById(
        {
          namespaceId: 'share-a',
          nodes: {
            root: node('root', { children: ['file'], hasChildren: true }),
          },
          ui: {
            root: { expanded: true, loading: false, loaded: true },
          },
        },
        'share-b'
      )
    ).toEqual({});
  });

  it('returns live loaded children for expandAll gap filling', () => {
    const state = {
      namespaceId: 'share-1',
      nodes: {
        root: node('root', { children: ['file'], hasChildren: true }),
        file: node('file', { parentId: 'root', resourceType: 'file' }),
      },
      ui: {
        root: { expanded: true, loading: false, loaded: true },
      },
    };

    expect(getShareSidebarLoadedChildren(state, 'share-1', 'root')).toEqual([
      {
        id: 'file',
        name: 'file',
        parent_id: 'root',
        resource_type: 'file',
        attrs: undefined,
        has_children: false,
        created_at: undefined,
        updated_at: undefined,
      },
    ]);
    expect(getShareSidebarLoadedChildren(state, 'share-1', 'missing')).toBe(
      null
    );
    expect(getShareSidebarLoadedChildren(state, 'share-2', 'root')).toBe(null);
  });
});
