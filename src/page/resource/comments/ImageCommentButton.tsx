import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { useEffect, useRef } from 'react';

import type { ResourceCommentEditor } from './commentAnchors';
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

function staysWithImageComment(
  next: EventTarget | null,
  host: HTMLElement | null
) {
  return (
    next instanceof Element &&
    (!!next.closest('.omnibox-floating-toolbar') ||
      (host?.contains(next) ?? false))
  );
}

function clearHoverSelection(
  editor: ResourceCommentEditor,
  range: { from: number; to: number }
) {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.from !== range.from) {
    return;
  }
  const near = TextSelection.near(editor.state.doc.resolve(range.from), -1);
  editor.view.dispatch(editor.state.tr.setSelection(near));
}

export function ImageCommentButton({
  controller,
}: {
  controller: ResourceCommentsController;
}) {
  const editor = controller.editor;
  const hostRef = useRef<HTMLElement | null>(null);
  const rangeRef = useRef<{ from: number; to: number } | null>(null);
  const available =
    !!editor &&
    !editor.isDestroyed &&
    controller.canComment &&
    !controller.contentDirty &&
    !controller.pendingSelection;

  useEffect(() => {
    if (!available || !editor) {
      return;
    }
    const root = editor.view.dom;
    root.classList.add('resource-image-comment-ready');
    const selectImage = (element: HTMLElement) => {
      const range = imageRangeForHoverTarget(editor, element);
      if (!range) {
        return;
      }
      hostRef.current = element;
      rangeRef.current = range;
      const { selection } = editor.state;
      if (selection instanceof NodeSelection && selection.from === range.from) {
        return;
      }
      editor.view.dispatch(
        editor.state.tr.setSelection(
          NodeSelection.create(editor.state.doc, range.from)
        )
      );
    };
    const onOver = (event: Event) => {
      const next = imageHoverElement(event.target);
      if (next) {
        selectImage(next);
      }
    };
    const onOut = (event: MouseEvent) => {
      if (staysWithImageComment(event.relatedTarget, hostRef.current)) {
        return;
      }
      const range = rangeRef.current;
      hostRef.current = null;
      rangeRef.current = null;
      if (range) {
        clearHoverSelection(editor, range);
      }
    };
    root.addEventListener('mouseover', onOver);
    root.addEventListener('mouseout', onOut);
    document.addEventListener('mouseout', onOut);
    return () => {
      root.classList.remove('resource-image-comment-ready');
      root.removeEventListener('mouseover', onOver);
      root.removeEventListener('mouseout', onOut);
      document.removeEventListener('mouseout', onOut);
    };
  }, [available, editor]);

  return <span hidden />;
}
