import type { OmniboxEditorCommentSelection } from '@import-ai/omnibox-editor';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEffect } from 'react';

const commentDraftHighlightKey = new PluginKey<DecorationSet>(
  'resourceCommentDraftHighlight'
);

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
            Decoration.inline(from, to, {
              class: 'resource-comment-draft-highlight',
            }),
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
