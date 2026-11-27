/** @jest-environment jsdom */

import { Editor, Mark, Node } from '@tiptap/core';
import { history, undo, undoDepth } from '@tiptap/pm/history';
import { NodeSelection } from '@tiptap/pm/state';
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { installActiveCommentHighlight } from './activeCommentHighlight';
import {
  addImageCommentMark,
  syncImageDraftHighlight,
} from './imageCommentMarks';
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
        name: 'paragraph',
        group: 'block',
        content: 'inline*',
        parseHTML: () => [{ tag: 'p' }],
        renderHTML: () => ['p', 0],
      }),
      Mark.create({
        name: 'bold',
        parseHTML: () => [{ tag: 'strong' }],
        renderHTML: () => ['strong', 0],
      }),
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
        excludes: '',
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
  editor,
  resolved,
  activeThreadId = 'thread-1',
}: {
  root: HTMLElement;
  editor?: Editor;
  resolved: boolean;
  activeThreadId?: string | null;
}) {
  useCommentHighlight({
    root,
    activeThreadId,
    resolved,
    ...(editor ? { editor } : {}),
  });
  return null;
}

describe('comment highlight DOM updates', () => {
  let container: HTMLElement;
  let root: Root;
  let editor: Editor;
  let rootMounted: boolean;
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
    rootMounted = true;
    editor = imageEditor();
    installActiveCommentHighlight(editor);
  });

  afterEach(async () => {
    if (rootMounted) {
      await act(async () => root.unmount());
    }
    editor.destroy();
    syncImageDraftHighlight(editor, null);
    observers.forEach(observer => observer.disconnect());
    observers.length = 0;
    globalThis.MutationObserver = nativeObserver;
    container.remove();
  });

  it.each([false, true])(
    'settles when an active comment crosses bold text with resolved=%s',
    async resolved => {
      editor.commands.setContent(
        '<p><span data-resource-comment-thread="thread-1">约 </span>' +
          '<strong><span data-resource-comment-thread="thread-1">57 分钟</span></strong>' +
          '<span data-resource-comment-thread="thread-1">，普遍 1 小时 20 分左右</span></p>'
      );
      const before = editor.getJSON();
      const redraw = jest.spyOn(editor.view, 'updateState');
      const onUpdate = jest.fn();
      editor.on('update', onUpdate);
      await act(async () => {
        root.render(
          createElement(Highlight, { root: editor.view.dom, editor, resolved })
        );
        await new Promise(resolve => setTimeout(resolve, 30));
      });
      expect(stoppedLoop).toBe(false);
      expect(redraw.mock.calls.length).toBeLessThan(8);
      expect(editor.getJSON()).toEqual(before);
      expect(onUpdate).not.toHaveBeenCalled();
      expect(
        Array.from(editor.view.dom.querySelectorAll('[data-comment-highlight]'))
          .map(element => element.textContent)
          .join('')
      ).toBe('约 57 分钟，普遍 1 小时 20 分左右');
      const deliveries = observerDeliveries;
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(observerDeliveries).toBe(deliveries);
    }
  );

  it('leaves ProseMirror DOM untouched while its editor is not registered', async () => {
    editor.commands.setContent(
      '<p><span data-resource-comment-thread="thread-1">Text</span></p>'
    );
    const before = editor.view.dom.innerHTML;
    await act(async () => {
      root.render(
        createElement(Highlight, { root: editor.view.dom, resolved: false })
      );
    });
    expect(editor.view.dom.innerHTML).toBe(before);
  });

  it('preserves gaps and overlapping threads while switching and clearing highlights', async () => {
    editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'First',
              marks: [
                { type: 'resourceComment', attrs: { threadId: 'thread-1' } },
              ],
            },
            { type: 'text', text: ' gap ' },
            {
              type: 'text',
              text: 'Shared',
              marks: [
                { type: 'resourceComment', attrs: { threadId: 'thread-1' } },
                { type: 'resourceComment', attrs: { threadId: 'thread-2' } },
              ],
            },
            {
              type: 'text',
              text: 'Second',
              marks: [
                { type: 'resourceComment', attrs: { threadId: 'thread-2' } },
              ],
            },
          ],
        },
      ],
    });
    const before = editor.getJSON();
    const highlightedText = () =>
      Array.from(editor.view.dom.querySelectorAll('[data-comment-highlight]'))
        .map(node => node.textContent)
        .join('');
    for (const [threadId, expected] of [
      ['thread-1', 'FirstShared'],
      ['thread-2', 'SharedSecond'],
      [null, ''],
    ] as const) {
      await act(async () =>
        root.render(
          createElement(Highlight, {
            root: editor.view.dom,
            editor,
            resolved: false,
            activeThreadId: threadId,
          })
        )
      );
      expect(highlightedText()).toBe(expected);
      expect(editor.getJSON()).toEqual(before);
    }
    expect(stoppedLoop).toBe(false);
  });

  it('follows edited marks without adding highlight changes to undo history', async () => {
    editor.commands.setContent(
      '<p><span data-resource-comment-thread="thread-1">Text</span></p>'
    );
    editor.registerPlugin(history());
    installActiveCommentHighlight(editor);
    const before = editor.getJSON();
    await act(async () =>
      root.render(
        createElement(Highlight, {
          root: editor.view.dom,
          editor,
          resolved: false,
        })
      )
    );
    expect(undoDepth(editor.state)).toBe(0);
    await act(async () => {
      editor.view.dispatch(
        editor.state.tr
          .insertText('!', 1)
          .removeMark(1, 2, editor.schema.marks.resourceComment)
      );
    });
    expect(
      editor.view.dom.querySelector('[data-comment-highlight]')?.textContent
    ).toBe('Text');
    await act(async () =>
      root.render(
        createElement(Highlight, {
          root: editor.view.dom,
          editor,
          resolved: false,
          activeThreadId: null,
        })
      )
    );
    expect(undoDepth(editor.state)).toBe(1);
    await act(async () => {
      undo(editor.state, editor.view.dispatch.bind(editor.view));
    });
    expect(editor.getJSON()).toEqual(before);
    expect(
      editor.view.dom.querySelector('[data-comment-highlight]')
    ).toBeNull();
  });

  it('expires resolved editor highlights and clears open highlights on unmount', async () => {
    editor.commands.setContent(
      '<p><span data-resource-comment-thread="thread-1">Text</span></p>'
    );
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
    try {
      await act(async () =>
        root.render(
          createElement(Highlight, {
            root: editor.view.dom,
            editor,
            resolved: true,
          })
        )
      );
      expect(
        editor.view.dom.querySelector('[data-comment-highlight="resolved"]')
      ).not.toBeNull();
      await act(async () => jest.advanceTimersByTime(1000));
      expect(
        editor.view.dom.querySelector('[data-comment-highlight]')
      ).toBeNull();
      await act(async () =>
        editor.view.dispatch(editor.state.tr.insertText('!', 1))
      );
      expect(
        editor.view.dom.querySelector('[data-comment-highlight]')
      ).toBeNull();
      await act(async () =>
        root.render(
          createElement(Highlight, {
            root: editor.view.dom,
            editor,
            resolved: false,
          })
        )
      );
      expect(
        editor.view.dom.querySelector('[data-comment-highlight="open"]')
      ).not.toBeNull();
      await act(async () => {
        root.unmount();
        rootMounted = false;
      });
      expect(
        editor.view.dom.querySelector('[data-comment-highlight]')
      ).toBeNull();
    } finally {
      jest.useRealTimers();
    }
    expect(stoppedLoop).toBe(false);
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
            createElement(Highlight, {
              root: editor.view.dom,
              editor,
              resolved,
            })
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

  it.each([
    { resolved: false, selected: true, threadCount: 0, draft: false },
    { resolved: false, selected: true, threadCount: 1, draft: false },
    { resolved: false, selected: false, threadCount: 1, draft: false },
    { resolved: true, selected: true, threadCount: 1, draft: false },
    { resolved: false, selected: true, threadCount: 2, draft: false },
    { resolved: false, selected: true, threadCount: 1, draft: true },
  ])(
    'settles while EditorContent unmounts before editor destruction: %j',
    async ({ resolved, selected, threadCount, draft }) => {
      await act(async () => {
        root.render(createElement(EditorContent, { editor }));
      });
      await act(async () => {
        for (let index = 1; index <= threadCount; index += 1) {
          addImageCommentMark(editor, {
            threadId: `thread-${index}`,
            from: 0,
            to: editor.state.doc.firstChild!.nodeSize,
            resolved,
          });
        }
        if (selected) {
          editor.view.dispatch(
            editor.state.tr.setSelection(
              NodeSelection.create(editor.state.doc, 0)
            )
          );
        }
        if (draft) {
          syncImageDraftHighlight(editor, {
            from: 0,
            to: editor.state.doc.firstChild!.nodeSize,
          });
        }
        await new Promise(resolve => setTimeout(resolve, 30));
      });
      const content = editor.getJSON();

      // React removes node views before useEditor's deferred destroy runs.
      await act(async () => {
        root.unmount();
        rootMounted = false;
        await new Promise(resolve => setTimeout(resolve, 30));
      });

      expect(editor.isDestroyed).toBe(false);
      expect(editor.view.dom.isConnected).toBe(false);
      expect(editor.view.dom.firstElementChild?.tagName).toBe('FIGURE');
      expect(stoppedLoop).toBe(false);
      expect(editor.getJSON()).toEqual(content);
      const deliveriesAfterUnmount = observerDeliveries;
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(observerDeliveries).toBe(deliveriesAfterUnmount);
      if (threadCount > 0) {
        expect(
          editor.view.dom.firstElementChild?.getAttribute(
            'data-resource-comment-threads'
          )
        ).toBe(
          Array.from(
            { length: threadCount },
            (_, index) => `thread-${index + 1}`
          ).join(' ')
        );
      }
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
