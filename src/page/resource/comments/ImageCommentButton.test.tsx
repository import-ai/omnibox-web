/** @jest-environment jsdom */

import { Editor, Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { ImageCommentButton } from './ImageCommentButton';
import type { ResourceCommentsController } from './useResourceComments';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

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
        renderHTML: () => ['div', { class: 'tiptap-image-content' }, 0],
      }),
    ],
    content: {
      type: 'doc',
      content: [{ type: 'image' }],
    },
  });
}

describe('ImageCommentButton', () => {
  let editor: Editor;
  let root: Root;
  let mount: HTMLDivElement;

  beforeEach(() => {
    editor = imageEditor();
    mount = document.createElement('div');
    document.body.append(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
    editor.destroy();
  });

  it('selects the image on hover so the text comment button can open', async () => {
    const controller = {
      editor,
      canComment: true,
      contentDirty: false,
      pendingSelection: null,
      commentsConfig: { onCreateRequest: () => undefined },
    } as unknown as ResourceCommentsController;

    await act(async () => {
      root.render(<ImageCommentButton controller={controller} />);
    });
    const image = editor.view.dom.querySelector('.tiptap-image-content');
    if (!(image instanceof HTMLElement)) {
      throw new Error('Missing image');
    }
    await act(async () => {
      image.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    expect(
      editor.state.doc.nodeAt((editor.state.selection as NodeSelection).from)
        ?.type.name
    ).toBe('image');
    expect(
      document.body.querySelector('.resource-image-comment-button')
    ).toBeNull();
  });

  it('does not offer a new comment while the document is being edited', async () => {
    const controller = {
      editor,
      canComment: true,
      contentDirty: true,
      pendingSelection: null,
      commentsConfig: { onCreateRequest: () => undefined },
    } as unknown as ResourceCommentsController;
    await act(async () => {
      root.render(<ImageCommentButton controller={controller} />);
    });
    const image = editor.view.dom.querySelector('.tiptap-image-content');
    await act(async () => {
      image?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(
      document.body.querySelector('.resource-image-comment-button')
    ).toBeNull();
  });
});
