import { NodeSelection } from '@tiptap/pm/state';
import { MessageSquareText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type { ResourceCommentEditor } from './commentAnchors';
import { IMAGE_COMMENT_STORED_QUOTE } from './commentQuote';
import { imageCommentAnchorRect } from './imageCommentMarks';
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
      const rect = range
        ? imageCommentAnchorRect(editor, range.from, range.to)
        : null;
      if (!rect) {
        setPosition(null);
        return;
      }
      setPosition({ top: rect.top, left: rect.right });
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
    <div
      className="tiptap-toolbar omnibox-floating-toolbar fixed z-40"
      data-variant="floating"
      style={{
        top: position.top - 4,
        left: position.left,
        transform: 'translate(-100%, -100%)',
      }}
    >
      <div className="tiptap-toolbar-group">
        <button
          type="button"
          className="tiptap-button"
          aria-label={t('resource_comments.add_comment')}
          title={t('resource_comments.add_comment')}
          onMouseDown={event => event.preventDefault()}
          onClick={() => {
            const range = selectedImageRange(editor);
            if (!range) {
              return;
            }
            controller.commentsConfig.onCreateRequest?.({
              editor,
              from: range.from,
              to: range.to,
              quotedText: IMAGE_COMMENT_STORED_QUOTE,
            });
          }}
        >
          <MessageSquareText className="tiptap-button-icon" />
        </button>
      </div>
    </div>,
    document.body
  );
}
