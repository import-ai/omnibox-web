import type { SidebarState } from './types';
import { isNodeFullySelected } from './utils';

type SelectionState = Pick<SidebarState, 'nodes' | 'selectedIds' | 'ui'>;
type CheckedState = boolean | 'indeterminate';

export function createNodeSelectionStateSelector() {
  let previousNodes: SelectionState['nodes'] | undefined;
  let previousSelection: SelectionState['selectedIds'] | undefined;
  let previousUI: SelectionState['ui'] | undefined;
  let selectedAncestorIds = new Set<string>();
  let checkedStates = new Map<string, CheckedState>();

  return (
    { nodes, selectedIds, ui }: SelectionState,
    id: string
  ): boolean | 'indeterminate' => {
    if (isNodeFullySelected(nodes, selectedIds, id)) return true;

    // Immer preserves these references between unrelated updates. Share one
    // ancestor walk and child aggregation across rows. Loading completeness
    // matters too: an incomplete child list cannot imply full selection.
    if (
      nodes !== previousNodes ||
      selectedIds !== previousSelection ||
      ui !== previousUI
    ) {
      selectedAncestorIds = new Set();
      checkedStates = new Map();
      for (const selectedId of Object.keys(selectedIds)) {
        if (!selectedIds[selectedId]) continue;
        let parentId = nodes[selectedId]?.parentId;
        while (parentId) {
          const parent = nodes[parentId];
          if (!parent?.parentId || selectedAncestorIds.has(parentId)) break;
          selectedAncestorIds.add(parentId);
          parentId = parent.parentId;
        }
      }
      previousNodes = nodes;
      previousSelection = selectedIds;
      previousUI = ui;
    }

    const resolve = (nodeId: string): CheckedState => {
      const node = nodes[nodeId];
      if (!node) return false;
      if (selectedIds[nodeId]) return true;
      if (!selectedAncestorIds.has(nodeId)) return false;
      const cached = checkedStates.get(nodeId);
      if (cached !== undefined) return cached;

      const checked =
        ui[nodeId]?.loaded === true &&
        node.children.length > 0 &&
        node.children.every(childId => resolve(childId) === true)
          ? true
          : 'indeterminate';
      checkedStates.set(nodeId, checked);
      return checked;
    };

    return resolve(id);
  };
}
