/** @jest-environment jsdom */

import { Editor, Node } from '@tiptap/core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  addImageCommentMark,
  removeImageCommentMark,
} from './imageCommentMarks';
import { useSelectedImageCommentThreads } from './useSelectedImageCommentThreads';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Fixture({ editor }: { editor: Editor | null }) {
  const ids = useSelectedImageCommentThreads(editor);
  return <output>{ids.join(' ')}</output>;
}

describe('selected image comment threads', () => {
  let editor: Editor;
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    editor = new Editor({
      editable: false,
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
          renderHTML: () => ['figure', ['img']],
        }),
      ],
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph' },
          { type: 'image' },
          { type: 'image' },
          { type: 'image' },
        ],
      },
    });
    addImageCommentMark(editor, {
      threadId: 'first',
      from: 2,
      to: 3,
      resolved: false,
    });
    addImageCommentMark(editor, {
      threadId: 'second',
      from: 2,
      to: 3,
      resolved: true,
    });
    addImageCommentMark(editor, {
      threadId: 'other-image',
      from: 3,
      to: 4,
      resolved: false,
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    editor.destroy();
    container.remove();
  });

  it('includes every thread on the selected image and clears on another selection', async () => {
    await act(async () => root.render(<Fixture editor={editor} />));
    await act(async () => {
      editor.commands.setNodeSelection(2);
    });
    expect(container.textContent).toBe('first second');
    await act(async () => {
      editor.commands.setNodeSelection(3);
    });
    expect(container.textContent).toBe('other-image');
    await act(async () => {
      editor.commands.setNodeSelection(4);
    });
    expect(container.textContent).toBe('');
    await act(async () => {
      editor.commands.setTextSelection(1);
    });
    expect(container.textContent).toBe('');
  });

  it('updates added and removed threads without changing the selected image', async () => {
    await act(async () => root.render(<Fixture editor={editor} />));
    await act(async () => {
      editor.commands.setNodeSelection(2);
    });
    await act(async () => {
      addImageCommentMark(editor, {
        threadId: 'new',
        from: 2,
        to: 3,
        resolved: false,
      });
      removeImageCommentMark(editor, 'first');
    });
    expect(container.textContent).toBe('second new');
    await act(async () => root.render(<Fixture editor={null} />));
    expect(container.textContent).toBe('');
  });

  it('clears the highlights when the selected editor is destroyed', async () => {
    await act(async () => root.render(<Fixture editor={editor} />));
    await act(async () => {
      editor.commands.setNodeSelection(2);
    });
    expect(container.textContent).toBe('first second');
    await act(async () => editor.destroy());
    expect(container.textContent).toBe('');
  });
});
