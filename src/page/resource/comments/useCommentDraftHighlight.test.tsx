/** @jest-environment jsdom */

import { Editor, Node } from '@tiptap/core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { useCommentDraftHighlight } from './useCommentDraftHighlight';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Fixture({ editor, open }: { editor: Editor; open: boolean }) {
  useCommentDraftHighlight(
    open ? { editor, from: 1, to: 9, quotedText: 'Selected' } : null
  );
  return null;
}

describe('comment draft highlight', () => {
  let container: HTMLDivElement;
  let editor: Editor;
  let root: Root;

  beforeEach(() => {
    editor = new Editor({
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Selected text' }],
          },
        ],
      },
      extensions: [
        Node.create({ name: 'doc', topNode: true, content: 'block+' }),
        Node.create({
          name: 'paragraph',
          group: 'block',
          content: 'inline*',
          renderHTML: () => ['p', 0],
        }),
        Node.create({ name: 'text', group: 'inline' }),
      ],
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    editor.destroy();
  });

  it('shows the selected text while composing and removes it on cancel', async () => {
    await act(async () => root.render(<Fixture editor={editor} open />));
    expect(
      editor.view.dom.querySelector('.resource-comment-draft-highlight')
        ?.textContent
    ).toBe('Selected');

    await act(async () =>
      root.render(<Fixture editor={editor} open={false} />)
    );
    expect(
      editor.view.dom.querySelector('.resource-comment-draft-highlight')
    ).toBeNull();
  });
});
