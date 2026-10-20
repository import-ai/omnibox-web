/** @jest-environment jsdom */

import { Editor, Mark, Node } from '@tiptap/core';
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { addImageCommentMark } from './imageCommentMarks';
import { useCommentHighlight } from './useCommentHighlight';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function ImageView() {
  return createElement(
    NodeViewWrapper,
    { className: 'tiptap-image' },
    createElement('img', { alt: 'Fixture' }),
    createElement(NodeViewContent, {
      as: 'figcaption',
      className: 'tiptap-image-caption',
    })
  );
}

function imageEditor() {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      Node.create({ name: 'doc', topNode: true, content: 'block+' }),
      Node.create({ name: 'text', group: 'inline' }),
      Node.create({
        name: 'image',
        group: 'block',
        content: 'inline*',
        parseHTML: () => [{ tag: 'figure', contentElement: 'figcaption' }],
        renderHTML: () => ['figure', ['img'], ['figcaption', 0]],
        addNodeView: () => ReactNodeViewRenderer(ImageView),
      }),
      Mark.create({
        name: 'resourceComment',
        addAttributes: () => ({
          threadId: {
            default: 'thread-1',
            parseHTML: element =>
              element.getAttribute('data-resource-comment-thread'),
            renderHTML: attributes => ({
              'data-resource-comment-thread': attributes.threadId,
            }),
          },
        }),
        parseHTML: () => [{ tag: 'span[data-resource-comment-thread]' }],
        renderHTML: ({ HTMLAttributes }) => ['span', HTMLAttributes, 0],
      }),
    ],
    content: {
      type: 'doc',
      content: [
        {
          type: 'image',
          content: [
            {
              type: 'text',
              text: 'Caption',
              marks: [{ type: 'resourceComment' }],
            },
          ],
        },
      ],
    },
  });
}

function Highlight({
  root,
  resolved,
  activeThreadId = 'thread-1',
}: {
  root: HTMLElement;
  resolved: boolean;
  activeThreadId?: string | null;
}) {
  useCommentHighlight({ root, activeThreadId, resolved });
  return null;
}

describe('comment highlight DOM updates', () => {
  let container: HTMLElement;
  let root: Root;
  let editor: Editor;
  let observerDeliveries: number;
  let stoppedLoop: boolean;
  const nativeObserver = globalThis.MutationObserver;
  const observers: MutationObserver[] = [];

  beforeEach(() => {
    observerDeliveries = 0;
    stoppedLoop = false;
    // Keep a regression from starving timers and hanging the entire Jest worker.
    globalThis.MutationObserver = class extends nativeObserver {
      constructor(callback: MutationCallback) {
        super((records, observer) => {
          observerDeliveries += 1;
          if (observerDeliveries > 40) {
            stoppedLoop = true;
            observers.forEach(item => item.disconnect());
            return;
          }
          callback(records, observer);
        });
        observers.push(this);
      }
    };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    editor = imageEditor();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    editor.destroy();
    observers.forEach(observer => observer.disconnect());
    observers.length = 0;
    globalThis.MutationObserver = nativeObserver;
    container.remove();
  });

  it.each([false, true])(
    'settles after highlighting a captioned image with resolved=%s',
    async resolved => {
      await act(async () => {
        root.render(createElement(EditorContent, { editor }));
      });
      addImageCommentMark(editor, {
        threadId: 'thread-1',
        from: 0,
        to: editor.state.doc.firstChild!.nodeSize,
        resolved,
      });
      await act(async () => {
        root.render(
          createElement(
            'div',
            null,
            createElement(EditorContent, { editor }),
            createElement(Highlight, { root: editor.view.dom, resolved })
          )
        );
        await new Promise(resolve => setTimeout(resolve, 30));
      });
      const expected = resolved ? 'resolved' : 'open';
      expect(stoppedLoop).toBe(false);
      expect(
        editor.view.dom
          .querySelector('.node-image')
          ?.getAttribute('data-comment-highlight')
      ).toBe(expected);
      expect(editor.state.doc.textContent).toBe('Caption');
      const deliveriesAfterHighlight = observerDeliveries;
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
      });
      expect(observerDeliveries).toBe(deliveriesAfterHighlight);
    }
  );

  it('restores a replaced caption mark without rewriting an existing highlight', async () => {
    const source = document.createElement('div');
    source.innerHTML =
      '<span data-resource-comment-thread="thread-1">Caption</span>';
    container.after(source);
    const writes: MutationRecord[] = [];
    const observer = new nativeObserver(records => writes.push(...records));
    try {
      await act(async () => {
        root.render(
          createElement(Highlight, { root: source, resolved: false })
        );
      });
      observer.observe(source, {
        subtree: true,
        attributes: true,
        attributeFilter: ['data-comment-highlight'],
      });
      const caption = source.firstElementChild!;
      await act(async () => {
        caption.setAttribute('data-resource-comment-thread', 'thread-1');
      });
      expect(writes).toHaveLength(0);

      const replacement = caption.cloneNode(true) as HTMLElement;
      replacement.removeAttribute('data-comment-highlight');
      await act(async () => caption.replaceWith(replacement));
      expect(replacement.dataset.commentHighlight).toBe('open');
      expect(caption.hasAttribute('data-comment-highlight')).toBe(false);
      expect(writes).toHaveLength(1);
    } finally {
      observer.disconnect();
      source.remove();
    }
  });

  it('moves and clears the highlight when the active comment changes', async () => {
    const source = document.createElement('div');
    source.innerHTML =
      '<span data-resource-comment-thread="thread-1">First</span>' +
      '<span data-resource-comment-thread="thread-2">Second</span>';
    container.after(source);
    try {
      await act(async () => {
        root.render(
          createElement(Highlight, { root: source, resolved: false })
        );
      });
      expect(
        source.firstElementChild?.getAttribute('data-comment-highlight')
      ).toBe('open');
      await act(async () => {
        root.render(
          createElement(Highlight, {
            root: source,
            resolved: false,
            activeThreadId: 'thread-2',
          })
        );
      });
      expect(
        source.firstElementChild?.hasAttribute('data-comment-highlight')
      ).toBe(false);
      expect(
        source.lastElementChild?.getAttribute('data-comment-highlight')
      ).toBe('open');
      await act(async () => {
        root.render(
          createElement(Highlight, {
            root: source,
            resolved: false,
            activeThreadId: null,
          })
        );
      });
      expect(source.querySelector('[data-comment-highlight]')).toBeNull();
    } finally {
      source.remove();
    }
  });

  it('expires a resolved highlight without restoring it on later mutations', async () => {
    const source = document.createElement('div');
    source.innerHTML =
      '<span data-resource-comment-thread="thread-1">Caption</span>';
    container.after(source);
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
    try {
      await act(async () => {
        root.render(createElement(Highlight, { root: source, resolved: true }));
      });
      const caption = source.firstElementChild!;
      expect(caption.getAttribute('data-comment-highlight')).toBe('resolved');
      await act(async () => jest.advanceTimersByTime(1000));
      expect(caption.hasAttribute('data-comment-highlight')).toBe(false);
      await act(async () => {
        caption.setAttribute('data-resource-comment-thread', 'thread-1');
      });
      expect(caption.hasAttribute('data-comment-highlight')).toBe(false);
    } finally {
      jest.useRealTimers();
      source.remove();
    }
  });
});
