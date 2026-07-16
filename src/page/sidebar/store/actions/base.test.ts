import type { Resource, SpaceType } from '@/interface';

import type { SidebarStore, TreeNode } from '../types';
import { buildBaseActions } from './base';

function node(
  id: string,
  parentId: string | null,
  spaceType: SpaceType,
  children: string[] = []
): TreeNode {
  return {
    id,
    parentId,
    spaceType,
    name: id,
    resourceType: id === 'smart-folder' ? 'smart_folder' : 'folder',
    hasChildren: children.length > 0,
    createdAt: '',
    updatedAt: '',
    children,
  };
}

it('keeps a moved node when the old parent refresh finishes last', () => {
  const state = {
    nodes: {
      private: node('private', null, 'private', ['smart-folder']),
      teamspace: node('teamspace', null, 'teamspace'),
      'smart-folder': node('smart-folder', 'private', 'private'),
    },
    ui: {},
    activeId: null,
  } as unknown as SidebarStore;
  const actions = buildBaseActions(update => update(state));
  const moved = {
    id: 'smart-folder',
    parent_id: 'teamspace',
    name: 'Smart folder',
    resource_type: 'smart_folder',
  } as Resource;

  actions.refreshChildren('teamspace', [moved]);
  actions.refreshChildren('private', []);

  expect(state.nodes['smart-folder']?.parentId).toBe('teamspace');
  expect(state.nodes.teamspace.children).toEqual(['smart-folder']);
  expect(state.nodes.private.children).toEqual([]);
});
