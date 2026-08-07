import { uploadResource } from '@/service/resource';

import { refreshSortedChildren } from '../refreshSortedChildren';
import type { SidebarGet, SidebarSet } from '../types';
import { createNode, ensureUI, insertUnspecifiedChild } from '../utils';

export function buildUploadActions(set: SidebarSet, get: SidebarGet) {
  const lastProgressTimes = new Map<string, number>();

  return {
    uploadFiles: async (parentId: string, files: FileList) => {
      const parent = get().nodes[parentId];
      if (!parent) throw new Error('Parent not found');

      set(s => {
        s.dialogs.upload[parentId] = '';
      });

      try {
        const response = await uploadResource(files, {
          parentId,
          namespaceId: get().namespaceId,
          onProgress: ({ done, total }) => {
            const now = Date.now();
            const last = lastProgressTimes.get(parentId) || 0;
            if (now - last < 100) return;
            lastProgressTimes.set(parentId, now);
            set(s => {
              s.dialogs.upload[parentId] = `${done}/${total}`;
            });
          },
        });

        const resources = Array.isArray(response) ? response : [response];
        const manualSort =
          get().resourceSorts[parent.spaceType].sort_by === 'manual';

        set(s => {
          for (const res of resources) {
            const node = createNode(res, parentId, parent.spaceType);
            s.nodes[node.id] = node;
            const p = s.nodes[parentId];
            if (p) {
              p.children = insertUnspecifiedChild(
                p.children,
                node.id,
                manualSort
              );
              p.hasChildren = true;
              ensureUI(s, parentId).expanded = true;
            }
          }
        });

        if (!manualSort) {
          await refreshSortedChildren(get, parentId);
        }

        const last = resources[resources.length - 1];
        return last.id;
      } finally {
        set(s => {
          delete s.dialogs.upload[parentId];
        });
      }
    },
  };
}
