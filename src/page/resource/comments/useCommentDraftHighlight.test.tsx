/** @jest-environment jsdom */

import { Editor, Node } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { useCommentDraftHighlight } from './useCommentDraftHighlight';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Fixture({ editor, open }: { editor: Editor; open: boolean }) {
  useCommentDraftHighlight(
    editor,
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

  it('does not rebuild editor plugins when the draft closes', async () => {
    let initializations = 0;
    editor.registerPlugin(
      new Plugin({
        key: new PluginKey('keep'),
        state: {
          init: () => {
            initializations += 1;
            return 1;
          },
          apply: (_transaction, value: number) => value,
        },
      })
    );
    expect(initializations).toBe(1);

    await act(async () => root.render(<Fixture editor={editor} open />));
    expect(initializations).toBe(1);

    await act(async () =>
      root.render(<Fixture editor={editor} open={false} />)
    );
    expect(initializations).toBe(1);
    expect(
      editor.view.dom.querySelector('.resource-comment-draft-highlight')
    ).toBeNull();
  });
});
