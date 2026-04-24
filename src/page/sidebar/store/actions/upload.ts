import { uploadResource } from '@/service/resource';

import type { SidebarGet, SidebarSet } from '../types';
import { createNode, ensureUI } from '../utils';

export function buildUploadActions(set: SidebarSet, get: SidebarGet) {
  const lastProgressTimes = new Map<string, number>();

  return {
    uploadFiles: async (parentId: string, files: FileList | File[]) => {
      const parent = get().nodes[parentId];
      if (!parent) throw new Error('Parent not found');

      set(s => {
        s.upload[parentId] = '';
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
              s.upload[parentId] = `${done}/${total}`;
            });
          },
        });

        const resources = Array.isArray(response) ? response : [response];

        set(s => {
          for (const res of resources) {
            const node = createNode(res, parentId, parent.spaceType);
            s.nodes[node.id] = node;
            const p = s.nodes[parentId];
            if (p) {
              p.children.unshift(node.id);
              p.hasChildren = true;
              ensureUI(s, parentId).expanded = true;
            }
          }
        });

        const last = resources[resources.length - 1];
        return last.id;
      } finally {
        set(s => {
          delete s.upload[parentId];
        });
      }
    },
  };
}
