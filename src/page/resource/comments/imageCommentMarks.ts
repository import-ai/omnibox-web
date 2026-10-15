import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import type { ResourceCommentEditor } from './commentAnchors';

export interface ImageCommentMark {
  threadId: string;
  from: number;
  to: number;
  resolved: boolean;
}

type ImageCommentMeta =
  | { type: 'add'; image: ImageCommentMark }
  | { type: 'remove'; threadId: string }
  | { type: 'resolve'; threadId: string; resolved: boolean };

const imageCommentMarkKey = new PluginKey<{
  images: Map<string, ImageCommentMark>;
}>('omniboxWebImageComments');

const PAINTED_COMMENT = 'data-omnibox-image-comment';
const DRAFT_COMMENT = 'data-omnibox-image-draft';
const THREADS_ATTR = 'data-resource-comment-threads';

let imageCommentOpener: (threadId: string) => void = () => undefined;
let activeImageThreadId: string | null = null;
let draftImageRange: { from: number; to: number } | null = null;

export function setImageCommentOpener(opener: (threadId: string) => void) {
  imageCommentOpener = opener;
}

export function setActiveImageThreadId(threadId: string | null) {
  activeImageThreadId = threadId;
}

export function commentThreadIds(element: HTMLElement) {
  const listed = element.getAttribute(THREADS_ATTR);
  const single = element.getAttribute('data-resource-comment-thread');
  return (listed ?? single ?? '').split(/\s+/).filter(Boolean);
}

export function elementHasCommentThread(
  element: HTMLElement,
  threadId: string
) {
  return commentThreadIds(element).includes(threadId);
}

interface EditorViewLike {
  dom: HTMLElement;
  nodeDOM: (position: number) => Node | null;
  state: ResourceCommentEditor['state'];
}

function isImageRange(
  doc: ResourceCommentEditor['state']['doc'],
  from: number,
  to: number
) {
  const node = doc.nodeAt(from);
  return Boolean(
    node && node.type.name === 'image' && to === from + node.nodeSize
  );
}

export function imageCommentAnchorRect(
  editor: ResourceCommentEditor,
  from: number,
  to: number
) {
  if (!isImageRange(editor.state.doc, from, to) || editor.isDestroyed) {
    return null;
  }
  const nodeDom = editor.view.nodeDOM(from);
  const host =
    nodeDom instanceof HTMLElement
      ? (nodeDom.querySelector('.tiptap-image-content') ?? nodeDom)
      : null;
  if (!(host instanceof HTMLElement)) {
    return null;
  }
  const visual =
    host.querySelector('.tiptap-image-img') ??
    host.querySelector('img') ??
    host;
  const rect = visual.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return null;
  }
  return rect;
}

function canDecorate(editor: ResourceCommentEditor) {
  const candidate = editor as ResourceCommentEditor & {
    registerPlugin?: (plugin: Plugin) => void;
    state: ResourceCommentEditor['state'] & { plugins?: readonly Plugin[] };
    view?: { dispatch?: (transaction: unknown) => void };
  };
  return (
    typeof candidate.registerPlugin === 'function' &&
    typeof candidate.view?.dispatch === 'function' &&
    Array.isArray(candidate.state.plugins)
  );
}

function commentHost(dom: HTMLElement) {
  return (
    dom.closest<HTMLElement>('.node-image') ??
    (dom.querySelector('.tiptap-image-content') ? dom : null) ??
    dom
  );
}

function clearPaintedComment(element: HTMLElement) {
  element.removeAttribute('data-resource-comment-thread');
  element.removeAttribute(THREADS_ATTR);
  element.removeAttribute('data-resource-comment-resolved');
  element.removeAttribute(PAINTED_COMMENT);
  element.classList.remove(
    'tiptap-thread',
    'tiptap-thread--block',
    'tiptap-thread--resolved',
    'tiptap-thread--unresolved'
  );
}

// TipTap's React node view returns true when only decorations change, and does
// not copy those attributes onto div.node-image. Write them after the view updates.
function paintImageCommentDom(view: EditorViewLike) {
  const images =
    imageCommentMarkKey.getState(view.state)?.images ??
    new Map<string, ImageCommentMark>();
  const grouped = new Map<HTMLElement, ImageCommentMark[]>();
  for (const image of images.values()) {
    const nodeDom = view.nodeDOM(image.from);
    if (!(nodeDom instanceof HTMLElement)) {
      continue;
    }
    const host = commentHost(nodeDom);
    const marks = grouped.get(host) ?? [];
    marks.push(image);
    grouped.set(host, marks);
  }
  const active = new Set<HTMLElement>();
  for (const [host, marks] of grouped) {
    const open = marks.filter(mark => !mark.resolved);
    const primary =
      marks.find(mark => mark.threadId === activeImageThreadId) ??
      open[0] ??
      marks[0];
    host.setAttribute('data-resource-comment-thread', primary.threadId);
    host.setAttribute(THREADS_ATTR, marks.map(mark => mark.threadId).join(' '));
    host.setAttribute(PAINTED_COMMENT, '');
    if (open.length === 0) {
      host.setAttribute('data-resource-comment-resolved', 'true');
    } else {
      host.removeAttribute('data-resource-comment-resolved');
    }
    host.classList.add('tiptap-thread', 'tiptap-thread--block');
    host.classList.toggle('tiptap-thread--resolved', open.length === 0);
    host.classList.toggle('tiptap-thread--unresolved', open.length > 0);
    active.add(host);
  }
  view.dom
    .querySelectorAll<HTMLElement>(`[${PAINTED_COMMENT}]`)
    .forEach(element => {
      if (!active.has(element)) {
        clearPaintedComment(element);
      }
    });
  paintDraftImage(view);
}

function paintDraftImage(view: EditorViewLike) {
  view.dom
    .querySelectorAll<HTMLElement>(`[${DRAFT_COMMENT}]`)
    .forEach(element => {
      element.removeAttribute(DRAFT_COMMENT);
      element.classList.remove('resource-comment-draft-highlight');
    });
  if (
    !draftImageRange ||
    !isImageRange(view.state.doc, draftImageRange.from, draftImageRange.to)
  ) {
    return;
  }
  const nodeDom = view.nodeDOM(draftImageRange.from);
  if (!(nodeDom instanceof HTMLElement)) {
    return;
  }
  const host = commentHost(nodeDom);
  host.classList.add('resource-comment-draft-highlight');
  host.setAttribute(DRAFT_COMMENT, '');
}

export function syncImageDraftHighlight(
  editor: ResourceCommentEditor,
  selection: { from: number; to: number } | null
) {
  const node = selection ? editor.state.doc.nodeAt(selection.from) : null;
  draftImageRange =
    selection &&
    node?.type.name === 'image' &&
    selection.to === selection.from + node.nodeSize
      ? { from: selection.from, to: selection.to }
      : null;
  if (!editor.isDestroyed) {
    paintDraftImage(editor.view);
  }
}

export function installImageCommentPlugin(editor: ResourceCommentEditor) {
  return ensureImageCommentPlugin(editor);
}

function ensureImageCommentPlugin(editor: ResourceCommentEditor) {
  if (!canDecorate(editor)) {
    return false;
  }
  const installed = editor.state.plugins.some(plugin =>
    plugin.key.startsWith(imageCommentMarkKey.key)
  );
  if (installed) {
    return true;
  }
  editor.registerPlugin(
    new Plugin<{ images: Map<string, ImageCommentMark> }>({
      key: imageCommentMarkKey,
      state: {
        init: () => ({ images: new Map() }),
        apply: (transaction, previous) => {
          const images = new Map<string, ImageCommentMark>();
          for (const image of previous.images.values()) {
            const from = transaction.mapping.map(image.from, 1);
            const to = transaction.mapping.map(image.to, -1);
            if (!isImageRange(transaction.doc, from, to)) {
              continue;
            }
            images.set(image.threadId, { ...image, from, to });
          }
          const meta = transaction.getMeta(imageCommentMarkKey) as
            ImageCommentMeta | undefined;
          if (meta?.type === 'add') {
            if (isImageRange(transaction.doc, meta.image.from, meta.image.to)) {
              images.set(meta.image.threadId, meta.image);
            }
          } else if (meta?.type === 'remove') {
            images.delete(meta.threadId);
          } else if (meta?.type === 'resolve') {
            const image = images.get(meta.threadId);
            if (image) {
              images.set(meta.threadId, { ...image, resolved: meta.resolved });
            }
          }
          return { images };
        },
      },
      props: {
        handleClick(view, _position, event) {
          const target = event.target;
          if (!(target instanceof Element) || event.button !== 0) {
            return false;
          }
          const host = target.closest<HTMLElement>(`[${THREADS_ATTR}]`);
          if (!host || !view.dom.contains(host)) {
            return false;
          }
          const ids = commentThreadIds(host);
          if (ids.length < 2) {
            return false;
          }
          const start = ids.indexOf(activeImageThreadId ?? '');
          const next = ids[(start + 1) % ids.length];
          activeImageThreadId = next;
          host.setAttribute('data-resource-comment-thread', next);
          imageCommentOpener(next);
          return true;
        },
        handleClickOn(view, _position, node, nodePosition, event) {
          if (node.type.name !== 'image' || event.button !== 0) {
            return false;
          }
          const nodeDom = view.nodeDOM(nodePosition);
          const commented =
            nodeDom instanceof HTMLElement &&
            commentHost(nodeDom).hasAttribute('data-resource-comment-thread');
          const { selection } = view.state;
          const alreadySelected =
            selection instanceof NodeSelection &&
            selection.from === nodePosition;
          if (!alreadySelected) {
            view.dispatch(
              view.state.tr.setSelection(
                NodeSelection.create(view.state.doc, nodePosition)
              )
            );
          }
          return !commented && !alreadySelected;
        },
        decorations: state => {
          const images = imageCommentMarkKey.getState(state)?.images;
          if (!images?.size) {
            return DecorationSet.empty;
          }
          return DecorationSet.create(
            state.doc,
            Array.from(images.values()).flatMap(image => {
              if (!isImageRange(state.doc, image.from, image.to)) {
                return [];
              }
              return [
                Decoration.node(image.from, image.to, {
                  class: image.resolved
                    ? 'tiptap-thread tiptap-thread--block tiptap-thread--resolved'
                    : 'tiptap-thread tiptap-thread--block tiptap-thread--unresolved',
                  'data-resource-comment-thread': image.threadId,
                  ...(image.resolved
                    ? { 'data-resource-comment-resolved': 'true' }
                    : {}),
                }),
              ];
            })
          );
        },
      },
      view: editorView => {
        paintImageCommentDom(editorView);
        return {
          update: paintImageCommentDom,
        };
      },
    })
  );
  return true;
}

function dispatchImageComment(
  editor: ResourceCommentEditor,
  meta: ImageCommentMeta
) {
  if (!ensureImageCommentPlugin(editor)) {
    return false;
  }
  editor.view.dispatch(editor.state.tr.setMeta(imageCommentMarkKey, meta));
  return true;
}

export function getImageCommentRange(
  editor: ResourceCommentEditor,
  threadId: string
) {
  return (
    imageCommentMarkKey.getState(editor.state)?.images.get(threadId) ?? null
  );
}

export function addImageCommentMark(
  editor: ResourceCommentEditor,
  image: ImageCommentMark
) {
  return dispatchImageComment(editor, { type: 'add', image });
}

export function removeImageCommentMark(
  editor: ResourceCommentEditor,
  threadId: string
) {
  return dispatchImageComment(editor, { type: 'remove', threadId });
}

export function setImageCommentResolved(
  editor: ResourceCommentEditor,
  threadId: string,
  resolved: boolean
) {
  return dispatchImageComment(editor, { type: 'resolve', threadId, resolved });
}
