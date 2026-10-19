import { MessageSquareText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

import type { ResourceCommentEditor } from './commentAnchors';
import { IMAGE_COMMENT_STORED_QUOTE } from './commentQuote';
import type { ResourceCommentsController } from './useResourceComments';

function imageHoverElement(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }
  const content = target.closest('.tiptap-image-content');
  return content instanceof HTMLElement ? content : null;
}

export function imageRangeForHoverTarget(
  editor: ResourceCommentEditor,
  target: HTMLElement
) {
  let match: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, position) => {
    if (match || node.type.name !== 'image') {
      return !match;
    }
    const dom = editor.view.nodeDOM(position);
    if (
      dom instanceof HTMLElement &&
      (dom === target || dom.contains(target) || target.contains(dom))
    ) {
      match = { from: position, to: position + node.nodeSize };
    }
    return true;
  });
  return match;
}

function imageVisualRect(element: HTMLElement) {
  const visual =
    element.querySelector('.tiptap-image-img') ??
    element.querySelector('img') ??
    element;
  const rect = visual.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return null;
  }
  return rect;
}

export function ImageCommentButton({
  controller,
}: {
  controller: ResourceCommentsController;
}) {
  const { t } = useTranslation();
  const editor = controller.editor;
  const buttonRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLElement | null>(null);
  const [hover, setHover] = useState<{
    top: number;
    left: number;
    from: number;
    to: number;
  } | null>(null);
  const available =
    !!editor &&
    !editor.isDestroyed &&
    !editor.isEditable &&
    controller.canComment &&
    !controller.contentDirty &&
    !controller.pendingSelection;

  useEffect(() => {
    if (!available || !editor) {
      setHover(null);
      return;
    }
    const root = editor.view.dom;
    const place = (element: HTMLElement) => {
      const range = imageRangeForHoverTarget(editor, element);
      const rect = imageVisualRect(element);
      if (!range || !rect) {
        return;
      }
      hostRef.current = element;
      setHover({
        top: rect.top,
        left: rect.right,
        from: range.from,
        to: range.to,
      });
    };
    const staysOpen = (next: EventTarget | null) =>
      next instanceof Node &&
      ((hostRef.current?.contains(next) ?? false) ||
        (buttonRef.current?.contains(next) ?? false));
    const onOver = (event: Event) => {
      const next = imageHoverElement(event.target);
      if (next) {
        place(next);
      }
    };
    const onOut = (event: MouseEvent) => {
      if (!staysOpen(event.relatedTarget)) {
        hostRef.current = null;
        setHover(null);
      }
    };
    const onScroll = () => {
      if (hostRef.current) {
        place(hostRef.current);
      }
    };
    root.addEventListener('mouseover', onOver);
    root.addEventListener('mouseout', onOut);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      root.removeEventListener('mouseover', onOver);
      root.removeEventListener('mouseout', onOut);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [available, editor]);

  if (!hover || !editor) {
    return null;
  }

  const mount =
    editor.view.dom.closest('.omnibox-editor-root') ?? document.body;

  return createPortal(
    <div
      ref={buttonRef}
      className="tiptap-toolbar omnibox-floating-toolbar resource-image-comment-button-anchor"
      data-variant="floating"
      data-image-hover-toolbar=""
      role="toolbar"
      style={{ top: hover.top, left: hover.left }}
      onMouseOut={event => {
        const next = event.relatedTarget;
        if (
          next instanceof Node &&
          (buttonRef.current?.contains(next) || hostRef.current?.contains(next))
        ) {
          return;
        }
        hostRef.current = null;
        setHover(null);
      }}
    >
      <div className="tiptap-toolbar-group" role="group">
        <Tooltip delayDuration={150} disableHoverableContent>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="tiptap-button"
              data-style="ghost"
              aria-label={t('resource_comments.add_comment')}
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                controller.commentsConfig.onCreateRequest?.({
                  editor,
                  from: hover.from,
                  to: hover.to,
                  quotedText: IMAGE_COMMENT_STORED_QUOTE,
                });
              }}
            >
              <MessageSquareText className="tiptap-button-icon" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('resource_comments.add_comment')}</TooltipContent>
        </Tooltip>
      </div>
    </div>,
    mount
  );
}
