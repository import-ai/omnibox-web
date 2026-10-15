import type { OmniboxEditorCommentSelection } from '@import-ai/omnibox-editor';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEffect } from 'react';

const commentDraftHighlightKey = new PluginKey<DecorationSet>(
  'resourceCommentDraftHighlight'
);

function createDraftHighlight(
  doc: OmniboxEditorCommentSelection['editor']['state']['doc'],
  from: number,
  to: number
) {
  const node = doc.nodeAt(from);
  const attrs = { class: 'resource-comment-draft-highlight' };
  if (node?.type.name === 'image' && to === from + node.nodeSize) {
    return Decoration.node(from, to, attrs);
  }
  return Decoration.inline(from, to, attrs);
}

export function useCommentDraftHighlight(
  selection: OmniboxEditorCommentSelection | null
) {
  useEffect(() => {
    if (!selection || selection.editor.isDestroyed) {
      return;
    }
    const { editor, from, to } = selection;
    const plugin = new Plugin<DecorationSet>({
      key: commentDraftHighlightKey,
      state: {
        init: (_, state) =>
          DecorationSet.create(state.doc, [
            createDraftHighlight(state.doc, from, to),
          ]),
        apply: (transaction, decorations) =>
          decorations.map(transaction.mapping, transaction.doc),
      },
      props: {
        decorations: state => commentDraftHighlightKey.getState(state),
      },
    });
    editor.registerPlugin(plugin);
    return () => {
      if (!editor.isDestroyed) {
        editor.unregisterPlugin(commentDraftHighlightKey);
      }
    };
  }, [selection]);
}
