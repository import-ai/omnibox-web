/** @jest-environment jsdom */
import { Schema } from '@tiptap/pm/model';
import {
  AllSelection,
  EditorState,
  NodeSelection,
  Plugin,
} from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';

import { createResourceImagePreviewPlugin } from './imagePreviewPlugin';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0] },
    table: {
      group: 'block',
      content: 'row+',
      toDOM: () => ['table', ['tbody', 0]],
    },
    row: { content: 'cell+', toDOM: () => ['tr', 0] },
    cell: { content: 'block+', toDOM: () => ['td', 0] },
    image: {
      group: 'block',
      atom: true,
      attrs: { src: { default: '/image.png' } },
      toDOM: node => [
        'div',
        [
          'img',
          {
            src: node.attrs.src,
            alt: 'Diagram',
            referrerpolicy: 'same-origin',
          },
        ],
      ],
    },
  },
});

function setup(editable = true, table = true) {
  let active = true;
  const preview = jest.fn();
  const imageNode = schema.nodes.image.create();
  const doc = schema.nodes.doc.create(
    null,
    table
      ? schema.nodes.table.create(
          null,
          schema.nodes.row.create(
            null,
            schema.nodes.cell.create(null, imageNode)
          )
        )
      : imageNode
  );
  const pos = table ? 3 : 0;
  const plugin = createResourceImagePreviewPlugin(preview, () => active);
  const native = new Plugin({
    props: {
      handleClickOn: (view, _pos, node, nodePos) => {
        if (node.type.name !== 'image') return false;
        view.dispatch(
          view.state.tr.setSelection(
            NodeSelection.create(view.state.doc, nodePos)
          )
        );
        return true;
      },
    },
  });
  const host = document.body.appendChild(document.createElement('div'));
  const view = new EditorView(host, {
    state: EditorState.create({ doc, plugins: [plugin, native] }),
    editable: () => editable,
  });
  const image = host.querySelector('img')!;
  Object.defineProperties(image, {
    complete: { value: true, configurable: true },
    naturalWidth: { value: 100, configurable: true },
  });
  const click = (options: MouseEventInit = {}, target: Element = image) => {
    const event = new MouseEvent('mouseup', { bubbles: true, ...options });
    target.dispatchEvent(event);
    view.someProp('handleClickOn', fn =>
      fn(view, pos, imageNode, pos, event, false)
    );
  };
  return {
    preview,
    view,
    image,
    click,
    deactivate: () => {
      active = false;
    },
    destroy: () => {
      view.destroy();
      host.remove();
    },
  };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test.each([
  [false, true],
  [false, false],
  [true, true],
])(
  'opens a loaded image after native selection without changing content (editable=%s table=%s)',
  (editable, table) => {
    const s = setup(editable, table);
    try {
      const before = s.view.state.doc.toJSON();
      s.click();
      expect(s.view.state.selection).toBeInstanceOf(NodeSelection);
      expect(s.preview).not.toHaveBeenCalled();
      jest.runAllTimers();
      expect(s.preview).toHaveBeenCalledTimes(1);
      expect(s.preview).toHaveBeenCalledWith(s.image, s.view);
      expect(s.view.state.doc.toJSON()).toEqual(before);
    } finally {
      s.destroy();
    }
  }
);

test('does not preview ordinary images while editing', () => {
  const s = setup(true, false);
  try {
    const before = s.view.state.doc.toJSON();
    s.click();
    jest.runAllTimers();
    expect(s.view.state.selection).toBeInstanceOf(NodeSelection);
    expect(s.preview).not.toHaveBeenCalled();
    expect(s.view.state.doc.toJSON()).toEqual(before);
  } finally {
    s.destroy();
  }
});

test.each([
  { shiftKey: true },
  { ctrlKey: true },
  { metaKey: true },
  { altKey: true },
  { button: 2 },
])('ignores modified/non-primary clicks %j', options => {
  const s = setup();
  try {
    s.click(options);
    jest.runAllTimers();
    expect(s.preview).not.toHaveBeenCalled();
  } finally {
    s.destroy();
  }
});

test('ignores captions and unloaded images', () => {
  const s = setup();
  try {
    s.click({}, s.image.parentElement!);
    Object.defineProperty(s.image, 'naturalWidth', { value: 0 });
    s.click();
    jest.runAllTimers();
    expect(s.preview).not.toHaveBeenCalled();
  } finally {
    s.destroy();
  }
});

test.each(['deactivate', 'destroy', 'detach', 'selection', 'source'])(
  'cancels stale requests after %s',
  change => {
    const s = setup();
    try {
      s.click();
      if (change === 'deactivate') s.deactivate();
      if (change === 'destroy') s.view.destroy();
      if (change === 'detach') s.image.remove();
      if (change === 'source') s.image.src = '/different.png';
      if (change === 'selection')
        s.view.dispatch(
          s.view.state.tr.setSelection(new AllSelection(s.view.state.doc))
        );
      jest.runAllTimers();
      expect(s.preview).not.toHaveBeenCalled();
    } finally {
      s.destroy();
    }
  }
);
