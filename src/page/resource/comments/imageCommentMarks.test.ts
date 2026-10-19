/** @jest-environment jsdom */

import { Editor, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { createElement, type ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

import {
  addImageCommentMark,
  getImageCommentRange,
  removeImageCommentMark,
  setActiveImageThreadId,
  setImageCommentOpener,
  syncImageDraftHighlight,
} from './imageCommentMarks';

function ReactImageView() {
  return createElement(
    NodeViewWrapper,
    { className: 'tiptap-image' },
    createElement(
      'div',
      { className: 'tiptap-image-container' },
      createElement(
        'div',
        { className: 'tiptap-image-content' },
        createElement('img', { className: 'tiptap-image-img', alt: '' })
      )
    )
  );
}

function imageEditor() {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      Node.create({ name: 'doc', topNode: true, content: 'block+' }),
      Node.create({
        name: 'paragraph',
        group: 'block',
        content: 'inline*',
        renderHTML: () => ['p', 0],
      }),
      Node.create({ name: 'text', group: 'inline' }),
      Node.create({
        name: 'image',
        group: 'block',
        inline: false,
        content: 'inline*',
        renderHTML: () => ['figure', ['img'], ['figcaption', 0]],
      }),
    ],
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
        { type: 'image', attrs: { src: 'dog.png' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
      ],
    },
  });
}

function imageRange(editor: Editor) {
  let range: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, position) => {
    if (!range && node.type.name === 'image') {
      range = { from: position, to: position + node.nodeSize };
    }
    return true;
  });
  if (!range) {
    throw new Error('Missing image');
  }
  return range;
}

function reactImageEditor() {
  const editor = new Editor({
    element: document.createElement('div'),
    extensions: [
      Node.create({ name: 'doc', topNode: true, content: 'block+' }),
      Node.create({
        name: 'paragraph',
        group: 'block',
        content: 'inline*',
        renderHTML: () => ['p', 0],
      }),
      Node.create({ name: 'text', group: 'inline' }),
      Node.create({
        name: 'image',
        group: 'block',
        inline: false,
        content: 'inline*',
        renderHTML: () => ['figure', 0],
        addNodeView() {
          return ReactNodeViewRenderer(ReactImageView, {
            trackNodeViewPosition: true,
          });
        },
      }),
    ],
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
        { type: 'image' },
      ],
    },
  });
  const reactEditor = editor as Editor & {
    contentComponent: {
      setRenderer: (id: string, renderer: unknown) => void;
      removeRenderer: (id: string) => void;
    } | null;
    isEditorContentInitialized: boolean;
    createNodeViews: () => void;
  };
  const roots = new Map<string, Root>();
  reactEditor.contentComponent = {
    setRenderer: (id, renderer) => {
      const target = renderer as {
        element: HTMLElement;
        reactElement: ReactElement;
      };
      let root = roots.get(id);
      if (!root) {
        root = createRoot(target.element);
        roots.set(id, root);
      }
      flushSync(() => {
        root.render(target.reactElement);
      });
    },
    removeRenderer: id => {
      roots.get(id)?.unmount();
      roots.delete(id);
    },
  };
  reactEditor.isEditorContentInitialized = true;
  reactEditor.createNodeViews();
  return editor;
}

describe('image comment marks', () => {
  it('paints the comment attribute on an image node without caption text', () => {
    const editor = imageEditor();
    try {
      const range = imageRange(editor);
      const marked = addImageCommentMark(editor, {
        threadId: 'thread-1',
        from: range.from,
        to: range.to,
        resolved: false,
      });

      expect(marked).toBe(true);
      expect(
        editor.view.dom
          .querySelector('figure')
          ?.getAttribute('data-resource-comment-thread')
      ).toBe('thread-1');
      expect(getImageCommentRange(editor, 'thread-1')).toMatchObject(range);
      expect(
        editor.state.doc.textBetween(range.from, range.to).includes('thread-1')
      ).toBe(false);
    } finally {
      editor.destroy();
    }
  });

  it('keeps the attribute on the image after text is inserted before it', () => {
    const editor = imageEditor();
    try {
      const range = imageRange(editor);
      addImageCommentMark(editor, {
        threadId: 'thread-1',
        ...range,
        resolved: false,
      });
      editor.commands.insertContentAt(1, 'Hi ');
      const moved = imageRange(editor);

      expect(getImageCommentRange(editor, 'thread-1')).toMatchObject(moved);
      expect(
        editor.view.dom
          .querySelector('figure')
          ?.getAttribute('data-resource-comment-thread')
      ).toBe('thread-1');

      expect(removeImageCommentMark(editor, 'thread-1')).toBe(true);
      expect(
        editor.view.dom
          .querySelector('figure')
          ?.hasAttribute('data-resource-comment-thread')
      ).toBe(false);
    } finally {
      editor.destroy();
    }
  });

  it('writes the comment attribute onto a React image node view', () => {
    const editor = reactImageEditor();
    try {
      const range = imageRange(editor);
      addImageCommentMark(editor, {
        threadId: 'thread-1',
        from: range.from,
        to: range.to,
        resolved: false,
      });
      const host = editor.view.dom.querySelector('.node-image');
      expect(host?.getAttribute('data-resource-comment-thread')).toBe(
        'thread-1'
      );
      expect(
        host
          ?.querySelector('.tiptap-image')
          ?.hasAttribute('data-resource-comment-thread')
      ).toBe(false);
      host?.removeAttribute('data-resource-comment-thread');
      editor.view.dispatch(editor.state.tr);
      expect(
        editor.view.dom
          .querySelector('.node-image')
          ?.getAttribute('data-resource-comment-thread')
      ).toBe('thread-1');
      expect(
        editor.view.dom
          .querySelector('.tiptap-image')
          ?.hasAttribute('data-resource-comment-thread')
      ).toBe(false);
    } finally {
      editor.destroy();
    }
  });

  it('keeps every thread painted on the same image', () => {
    const editor = imageEditor();
    const opened: string[] = [];
    setImageCommentOpener(threadId => {
      opened.push(threadId);
    });
    setActiveImageThreadId(null);
    try {
      const range = imageRange(editor);
      addImageCommentMark(editor, {
        threadId: 'thread-1',
        ...range,
        resolved: false,
      });
      addImageCommentMark(editor, {
        threadId: 'thread-2',
        ...range,
        resolved: false,
      });
      const figure = editor.view.dom.querySelector('figure');
      expect(figure?.getAttribute('data-resource-comment-threads')).toBe(
        'thread-1 thread-2'
      );
      expect(getImageCommentRange(editor, 'thread-2')).toMatchObject(range);
      const plugin = editor.state.plugins.find(item =>
        item.key.startsWith('omniboxWebImageComments')
      );
      const click = new MouseEvent('click');
      Object.defineProperty(click, 'target', { value: figure });
      plugin?.props.handleClick?.(editor.view, range.from, click);
      setActiveImageThreadId('thread-1');
      plugin?.props.handleClick?.(editor.view, range.from, click);
      expect(opened).toEqual(['thread-1', 'thread-2']);
    } finally {
      setImageCommentOpener(() => undefined);
      setActiveImageThreadId(null);
      editor.destroy();
    }
  });

  it('paints a draft underline on the image instead of a node decoration', () => {
    const editor = imageEditor();
    try {
      const range = imageRange(editor);
      syncImageDraftHighlight(editor, range);
      expect(
        editor.view.dom
          .querySelector('figure')
          ?.classList.contains('resource-comment-draft-highlight')
      ).toBe(true);
      syncImageDraftHighlight(editor, null);
      expect(
        editor.view.dom
          .querySelector('figure')
          ?.classList.contains('resource-comment-draft-highlight')
      ).toBe(false);
    } finally {
      editor.destroy();
    }
  });

  it('does not replace an image caption click with a node selection', () => {
    const editor = imageEditor();
    try {
      const range = imageRange(editor);
      addImageCommentMark(editor, {
        threadId: 'thread-1',
        ...range,
        resolved: false,
      });
      const plugin = editor.state.plugins.find(item =>
        item.key.startsWith('omniboxWebImageComments')
      );
      const caption = document.createElement('div');
      caption.className = 'tiptap-image-caption';
      const text = document.createElement('div');
      text.setAttribute('data-node-view-content', '');
      caption.append(text);
      document.body.append(caption);
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: text });

      editor.commands.setTextSelection(range.from + 1);
      const before = editor.state.selection.from;
      const handled = plugin?.props.handleClickOn?.(
        editor.view,
        range.from + 1,
        editor.state.doc.nodeAt(range.from)!,
        range.from,
        event,
        true
      );

      expect(handled).toBe(false);
      expect(editor.state.selection.from).toBe(before);
      caption.remove();
    } finally {
      editor.destroy();
    }
  });

  it('still selects the image when its body is clicked', () => {
    const editor = imageEditor();
    try {
      const range = imageRange(editor);
      addImageCommentMark(editor, {
        threadId: 'temporary-thread',
        ...range,
        resolved: false,
      });
      removeImageCommentMark(editor, 'temporary-thread');
      const plugin = editor.state.plugins.find(item =>
        item.key.startsWith('omniboxWebImageComments')
      );
      const image = editor.view.dom.querySelector('figure img')!;
      const event = new MouseEvent('click', { bubbles: true, button: 0 });
      Object.defineProperty(event, 'target', { value: image });

      const handled = plugin?.props.handleClickOn?.(
        editor.view,
        range.from,
        editor.state.doc.nodeAt(range.from)!,
        range.from,
        event,
        true
      );

      expect(handled).toBe(true);
      expect(editor.state.selection).toMatchObject({
        from: range.from,
        to: range.to,
      });
    } finally {
      editor.destroy();
    }
  });

  it('does not switch image comment threads when clicking a caption', () => {
    const editor = imageEditor();
    const opened: string[] = [];
    setImageCommentOpener(threadId => {
      opened.push(threadId);
    });
    setActiveImageThreadId('thread-1');
    try {
      const range = imageRange(editor);
      addImageCommentMark(editor, {
        threadId: 'thread-1',
        ...range,
        resolved: false,
      });
      addImageCommentMark(editor, {
        threadId: 'thread-2',
        ...range,
        resolved: false,
      });
      const figure = editor.view.dom.querySelector('figure')!;
      const caption = document.createElement('figcaption');
      caption.className = 'tiptap-image-caption';
      const text = document.createElement('span');
      caption.append(text);
      figure.append(caption);
      const event = new MouseEvent('click', { bubbles: true, button: 0 });
      Object.defineProperty(event, 'target', { value: text });

      const plugin = editor.state.plugins.find(item =>
        item.key.startsWith('omniboxWebImageComments')
      );
      const handled = plugin?.props.handleClick?.(
        editor.view,
        range.from,
        event
      );

      expect(handled).toBe(false);
      expect(opened).toEqual([]);
      expect(figure.getAttribute('data-resource-comment-thread')).toBe(
        'thread-1'
      );
    } finally {
      setImageCommentOpener(() => undefined);
      setActiveImageThreadId(null);
      editor.destroy();
    }
  });
});
