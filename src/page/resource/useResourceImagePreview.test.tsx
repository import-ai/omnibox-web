/** @jest-environment jsdom */
import { Editor, Node } from '@tiptap/core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { resourceImagePreviewKey } from './imagePreviewPlugin';
import { useResourceImagePreview } from './useResourceImagePreview';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const extensions = [
  Node.create({ name: 'doc', topNode: true, content: 'block+' }),
  Node.create({ name: 'text', group: 'inline' }),
  Node.create({
    name: 'paragraph',
    group: 'block',
    content: 'inline*',
    renderHTML: () => ['p', 0],
  }),
  Node.create({
    name: 'table',
    group: 'block',
    content: 'row+',
    renderHTML: () => ['table', ['tbody', 0]],
  }),
  Node.create({ name: 'row', content: 'cell+', renderHTML: () => ['tr', 0] }),
  Node.create({ name: 'cell', content: 'block+', renderHTML: () => ['td', 0] }),
  Node.create({
    name: 'image',
    group: 'block',
    atom: true,
    renderHTML: () => [
      'img',
      { src: '/a.png', alt: 'Diagram', referrerpolicy: 'same-origin' },
    ],
  }),
];

test('owns one preview registration, restores readonly focus, and clears it on resource switch/unmount', async () => {
  jest.useFakeTimers();
  const container = document.body.appendChild(document.createElement('div'));
  const host = document.body.appendChild(document.createElement('div'));
  host.tabIndex = -1;
  const editor = new Editor({
    element: host,
    extensions,
    editable: false,
    content: {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'row',
              content: [{ type: 'cell', content: [{ type: 'image' }] }],
            },
          ],
        },
      ],
    },
  });
  const root = createRoot(container);
  let preview!: ReturnType<typeof useResourceImagePreview>;
  function Harness({ identity }: { identity: string }) {
    preview = useResourceImagePreview(identity, { current: host });
    return null;
  }
  const click = () => {
    const img = host.querySelector('img')!;
    Object.defineProperties(img, {
      complete: { value: true, configurable: true },
      naturalWidth: { value: 100, configurable: true },
    });
    const event = new MouseEvent('mouseup', { bubbles: true });
    img.dispatchEvent(event);
    editor.view.someProp('handleClickOn', fn =>
      fn(editor.view, 3, editor.state.doc.nodeAt(3)!, 3, event, true)
    );
  };
  try {
    await act(async () => root.render(<Harness identity="first" />));
    await act(async () => {
      preview.registerImagePreview(editor);
      preview.registerImagePreview(editor);
      editor.commands.selectAll();
      click();
      editor.commands.setNodeSelection(3);
      click();
      jest.runOnlyPendingTimers();
    });
    expect(preview.imagePreviewProps.open).toBe(true);
    expect(preview.imagePreviewProps.src).toBe('http://localhost/a.png');
    expect(preview.imagePreviewProps.referrerPolicy).toBe('same-origin');
    await act(async () => preview.imagePreviewProps.onOpenChange(false));
    expect(preview.imagePreviewProps.src).toBeUndefined();
    const event = new Event('close', { cancelable: true });
    preview.imagePreviewProps.onCloseAutoFocus(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(host);
    await act(async () => {
      click();
      jest.runOnlyPendingTimers();
    });
    expect(preview.imagePreviewProps.open).toBe(true);
    await act(async () => root.render(<Harness identity="second" />));
    expect(preview.imagePreviewProps.open).toBe(false);
    expect(
      editor.state.plugins.filter(
        plugin => plugin.spec.key === resourceImagePreviewKey
      )
    ).toHaveLength(0);
    await act(async () => {
      preview.registerImagePreview(editor);
      click();
      root.unmount();
      jest.runOnlyPendingTimers();
    });
    expect(
      editor.state.plugins.filter(
        plugin => plugin.spec.key === resourceImagePreviewKey
      )
    ).toHaveLength(0);
  } finally {
    await act(async () => {
      root.unmount();
      editor.destroy();
    });
    container.remove();
    host.remove();
    jest.useRealTimers();
  }
});
