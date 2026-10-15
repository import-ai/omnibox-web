/** @jest-environment jsdom */

import { Editor, Node } from '@tiptap/core';

import {
  addImageCommentMark,
  getImageCommentRange,
  removeImageCommentMark,
} from './imageCommentMarks';

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
});
