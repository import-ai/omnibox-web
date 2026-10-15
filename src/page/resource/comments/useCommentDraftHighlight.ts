import type { OmniboxEditorCommentSelection } from '@import-ai/omnibox-editor';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEffect } from 'react';

import type { ResourceCommentEditor } from './commentAnchors';
import { syncImageDraftHighlight } from './imageCommentMarks';

const commentDraftHighlightKey = new PluginKey<DecorationSet>(
  'resourceCommentDraftHighlight'
);

function createDraftHighlight(
  doc: OmniboxEditorCommentSelection['editor']['state']['doc'],
  from: number,
  to: number
) {
  const node = doc.nodeAt(from);
  if (node?.type.name === 'image' && to === from + node.nodeSize) {
    return null;
  }
  return Decoration.inline(from, to, {
    class: 'resource-comment-draft-highlight',
  });
}

function hasDraftPlugin(editor: ResourceCommentEditor) {
  return editor.state.plugins.some(plugin =>
    plugin.key.startsWith(commentDraftHighlightKey.key)
  );
}

function draftDecorations(
  doc: OmniboxEditorCommentSelection['editor']['state']['doc'],
  selection: OmniboxEditorCommentSelection | null
) {
  if (
    !selection ||
    selection.from < 0 ||
    selection.from >= selection.to ||
    selection.to > doc.content.size
  ) {
    return DecorationSet.empty;
  }
  const decoration = createDraftHighlight(doc, selection.from, selection.to);
  return DecorationSet.create(doc, decoration ? [decoration] : []);
}

// registerPlugin/unregisterPlugin rebuild the editor state and reset every
// plugin, including the image-comment memory inside omnibox-editor. Register
// this plugin once and update it with metadata so those comments stay put.
function ensureDraftPlugin(editor: ResourceCommentEditor) {
  if (hasDraftPlugin(editor)) {
    return false;
  }
  editor.registerPlugin(
    new Plugin<DecorationSet>({
      key: commentDraftHighlightKey,
      state: {
        init: () => DecorationSet.empty,
        apply: (transaction, decorations) => {
          const next = transaction.getMeta(commentDraftHighlightKey) as
            DecorationSet | undefined;
          return next ?? decorations.map(transaction.mapping, transaction.doc);
        },
      },
      props: {
        decorations: state =>
          commentDraftHighlightKey.getState(state) ?? DecorationSet.empty,
      },
    })
  );
  return true;
}

export function useCommentDraftHighlight(
  editor: ResourceCommentEditor | null,
  selection: OmniboxEditorCommentSelection | null,
  onPluginCreated?: () => void
) {
  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }
    // Creating the plugin rebuilds editor state and clears image comments.
    if (ensureDraftPlugin(editor)) {
      onPluginCreated?.();
    }
    editor.view.dispatch(
      editor.state.tr.setMeta(
        commentDraftHighlightKey,
        draftDecorations(editor.state.doc, selection)
      )
    );
    syncImageDraftHighlight(editor, selection);
    return () => {
      if (!editor.isDestroyed) {
        syncImageDraftHighlight(editor, null);
      }
    };
  }, [editor, onPluginCreated, selection]);
}
