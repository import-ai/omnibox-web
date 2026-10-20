import { NodeSelection } from '@tiptap/pm/state';
import { useLayoutEffect, useState } from 'react';

import type { ResourceCommentEditor } from './commentAnchors';
import { commentThreadIds } from './imageCommentMarks';

export function useSelectedImageCommentThreads(
  editor: ResourceCommentEditor | null
): string[] {
  const [threadIds, setThreadIds] = useState<string[]>([]);

  useLayoutEffect(() => {
    const update = () => {
      let next: string[] = [];
      if (editor && !editor.isDestroyed) {
        const { selection } = editor.state;
        if (
          selection instanceof NodeSelection &&
          selection.node.type.name === 'image'
        ) {
          const dom = editor.view.nodeDOM(selection.from);
          if (dom instanceof HTMLElement) {
            next = commentThreadIds(dom.closest('.node-image') ?? dom);
          }
        }
      }
      setThreadIds(current =>
        current.length === next.length &&
        current.every((id, index) => id === next[index])
          ? current
          : next
      );
    };
    update();
    if (!editor || editor.isDestroyed) return;
    const clear = () => setThreadIds([]);
    editor.on('transaction', update);
    editor.on('destroy', clear);
    return () => {
      editor.off('transaction', update);
      editor.off('destroy', clear);
    };
  }, [editor]);

  return threadIds;
}
