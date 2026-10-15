/** @jest-environment jsdom */

import { Editor, Node } from '@tiptap/core';
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
    jest.restoreAllMocks();
    act(() => root.unmount());
    mount.remove();
    editor.destroy();
  });

  it('opens an image comment from the web button without editor text', async () => {
    const requests: Array<{ from: number; to: number; quotedText: string }> =
      [];
    const controller = {
      editor,
      canComment: true,
      contentDirty: false,
      pendingSelection: null,
      commentsConfig: {
        onCreateRequest: (selection: {
          from: number;
          to: number;
          quotedText: string;
        }) => {
          requests.push(selection);
        },
      },
    } as unknown as ResourceCommentsController;
    let imageFrom = 0;
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === 'image') {
        imageFrom = position;
      }
      return true;
    });
    await act(async () => {
      root.render(<ImageCommentButton controller={controller} />);
    });
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(
        () =>
          ({
            top: 20,
            left: 10,
            right: 110,
            bottom: 80,
            width: 100,
            height: 60,
            x: 10,
            y: 20,
          }) as DOMRect
      );
    const image = editor.view.dom.querySelector('.tiptap-image-content');
    const selectionBefore = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    await act(async () => {
      image?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    const button = document.body.querySelector(
      '.resource-image-comment-button-anchor .tiptap-button'
    );
    expect(button?.getAttribute('aria-label')).toBe(
      'resource_comments.add_comment'
    );
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.from).toBe(imageFrom);
    expect(requests[0]?.to).toBe(
      imageFrom + editor.state.doc.nodeAt(imageFrom)!.nodeSize
    );
    expect(requests[0]?.quotedText).toBe('[图片]');
    expect(editor.state.selection.from).toBe(selectionBefore.from);
    expect(editor.state.selection.to).toBe(selectionBefore.to);
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
      document.body.querySelector(
        '.resource-image-comment-button-anchor .tiptap-button'
      )
    ).toBeNull();
  });
});
