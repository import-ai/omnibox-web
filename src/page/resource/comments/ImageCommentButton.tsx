import { NodeSelection } from '@tiptap/pm/state';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type { ResourceCommentEditor } from './commentAnchors';
import { IMAGE_COMMENT_STORED_QUOTE } from './commentQuote';
import type { ResourceCommentsController } from './useResourceComments';

function selectedImageRange(editor: ResourceCommentEditor) {
  const { selection } = editor.state;
  if (
    selection instanceof NodeSelection &&
    selection.node.type.name === 'image'
  ) {
    return { from: selection.from, to: selection.to };
  }
  return null;
}

export function ImageCommentButton({
  controller,
}: {
  controller: ResourceCommentsController;
}) {
  const { t } = useTranslation();
  const editor = controller.editor;
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (
      !editor ||
      editor.isDestroyed ||
      !controller.canComment ||
      controller.contentDirty ||
      controller.pendingSelection
    ) {
      setPosition(null);
      return;
    }
    const update = () => {
      if (editor.isDestroyed) {
        setPosition(null);
        return;
      }
      const range = selectedImageRange(editor);
      const nodeDom = range ? editor.view.nodeDOM(range.from) : null;
      const host =
        nodeDom instanceof HTMLElement
          ? (nodeDom.querySelector('.tiptap-image-content') ?? nodeDom)
          : null;
      if (!(host instanceof HTMLElement)) {
        setPosition(null);
        return;
      }
      const rect = host.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPosition(null);
        return;
      }
      setPosition({
        top: Math.max(8, rect.top - 40),
        left: rect.left + rect.width / 2,
      });
    };
    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [
    controller.canComment,
    controller.contentDirty,
    controller.pendingSelection,
    editor,
  ]);

  if (!position || !editor) {
    return null;
  }

  return createPortal(
    <button
      type="button"
      className="fixed z-40 flex h-8 -translate-x-1/2 items-center rounded-md bg-neutral-900 px-2.5 text-xs text-white shadow-md"
      style={{ top: position.top, left: position.left }}
      onMouseDown={event => event.preventDefault()}
      onClick={() => {
        const range = selectedImageRange(editor);
        if (!range) {
          return;
        }
        controller.setCreateConflict(false);
        controller.setActiveThreadId(null);
        controller.setPendingSelection({
          editor,
          from: range.from,
          to: range.to,
          quotedText: IMAGE_COMMENT_STORED_QUOTE,
        });
        controller.setPanelOpen(true);
      }}
    >
      {t('resource_comments.add_comment')}
    </button>,
    document.body
  );
}
