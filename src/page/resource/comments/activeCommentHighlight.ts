import type { Node } from '@tiptap/pm/model';
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import type { ResourceCommentEditor } from './commentAnchors';

interface ActiveCommentHighlight {
  threadId: string;
  resolved: boolean;
}

interface HighlightState {
  active: ActiveCommentHighlight | null;
  decorations: DecorationSet;
}

const activeCommentHighlightKey = new PluginKey<HighlightState>(
  'resourceActiveCommentHighlight'
);

function createDecorations(doc: Node, active: ActiveCommentHighlight | null) {
  if (!active) return DecorationSet.empty;
  const decorations: Decoration[] = [];
  doc.descendants((node, position) => {
    if (
      node.isInline &&
      node.marks.some(
        mark =>
          mark.type.name === 'resourceComment' &&
          mark.attrs.threadId === active.threadId
      )
    ) {
      decorations.push(
        Decoration.inline(position, position + node.nodeSize, {
          class: 'resource-comment-active-highlight',
          'data-comment-highlight': active.resolved ? 'resolved' : 'open',
        })
      );
      return false;
    }
  });
  return DecorationSet.create(doc, decorations);
}

export function getActiveCommentHighlight(state: EditorState) {
  return activeCommentHighlightKey.getState(state)?.active ?? null;
}

// Install before restoring anchors so highlights use the restored document.
export function installActiveCommentHighlight(editor: ResourceCommentEditor) {
  if (activeCommentHighlightKey.getState(editor.state)) return;
  editor.registerPlugin(
    new Plugin<HighlightState>({
      key: activeCommentHighlightKey,
      state: {
        init: () => ({ active: null, decorations: DecorationSet.empty }),
        apply(transaction, previous) {
          const meta = transaction.getMeta(activeCommentHighlightKey) as
            ActiveCommentHighlight | null | undefined;
          if (meta === undefined && !transaction.docChanged) return previous;
          const active = meta === undefined ? previous.active : meta;
          return {
            active,
            decorations: createDecorations(transaction.doc, active),
          };
        },
      },
      props: {
        decorations: state =>
          activeCommentHighlightKey.getState(state)?.decorations ??
          DecorationSet.empty,
      },
    })
  );
}

export function setActiveCommentHighlight(
  editor: ResourceCommentEditor,
  active: ActiveCommentHighlight | null
) {
  if (editor.isDestroyed) return;
  editor.view.dispatch(
    editor.state.tr
      .setMeta(activeCommentHighlightKey, active)
      .setMeta('addToHistory', false)
  );
}
