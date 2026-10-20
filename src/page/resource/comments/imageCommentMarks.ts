import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { resourceImagePreviewKey } from '../imagePreviewPlugin';
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

function imageCommentDomState(marks: ImageCommentMark[]) {
  const open = marks.filter(mark => !mark.resolved);
  return {
    primary:
      marks.find(mark => mark.threadId === activeImageThreadId) ??
      open[0] ??
      marks[0],
    threadIds: marks.map(mark => mark.threadId).join(' '),
    resolved: open.length === 0,
  };
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
    // Unmounting EditorContent replaces React views with native node DOM.
    // Native nodes use decorations; manual writes would trigger redraw loops.
    const host = nodeDom.closest<HTMLElement>('.node-image');
    if (!host) {
      continue;
    }
    const marks = grouped.get(host) ?? [];
    marks.push(image);
    grouped.set(host, marks);
  }
  const active = new Set<HTMLElement>();
  for (const [host, marks] of grouped) {
    const { primary, threadIds, resolved } = imageCommentDomState(marks);
    host.setAttribute('data-resource-comment-thread', primary.threadId);
    host.setAttribute(THREADS_ATTR, threadIds);
    host.setAttribute(PAINTED_COMMENT, '');
    if (resolved) {
      host.setAttribute('data-resource-comment-resolved', 'true');
    } else {
      host.removeAttribute('data-resource-comment-resolved');
    }
    host.classList.add('tiptap-thread', 'tiptap-thread--block');
    host.classList.toggle('tiptap-thread--resolved', resolved);
    host.classList.toggle('tiptap-thread--unresolved', !resolved);
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
  const host = nodeDom.closest<HTMLElement>('.node-image');
  if (!host) {
    return;
  }
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
  if (!editor.isDestroyed && ensureImageCommentPlugin(editor)) {
    editor.view.dispatch(editor.state.tr);
  }
}

export function installImageCommentPlugin(editor: ResourceCommentEditor) {
  return ensureImageCommentPlugin(editor);
}

function ensureImageCommentPlugin(editor: ResourceCommentEditor) {
  if (!canDecorate(editor)) {
    return false;
  }
  const installed = editor.state.plugins.some(
    plugin => plugin.spec.key === imageCommentMarkKey
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
        handleClickOn(view, _position, node, nodePosition, event) {
          if (
            node.type.name !== 'image' ||
            event.button !== 0 ||
            event.shiftKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            !(event.target instanceof HTMLImageElement)
          ) {
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
          if (commented && !view.editable && nodeDom instanceof HTMLElement) {
            const threadId = commentHost(nodeDom).getAttribute(
              'data-resource-comment-thread'
            );
            if (threadId) {
              activeImageThreadId = threadId;
              imageCommentOpener(threadId);
            }
          }
          // The preview plugin consumes subsequent clicks. Preserve the native
          // image handler so selection-side and caption behavior stay intact.
          return false;
        },
        decorations: state => {
          const images = imageCommentMarkKey.getState(state)?.images;
          const grouped = new Map<number, ImageCommentMark[]>();
          for (const image of images?.values() ?? []) {
            if (isImageRange(state.doc, image.from, image.to)) {
              const marks = grouped.get(image.from) ?? [];
              marks.push(image);
              grouped.set(image.from, marks);
            }
          }
          const decorations = Array.from(grouped.values()).map(marks => {
            const { primary, threadIds, resolved } =
              imageCommentDomState(marks);
            return Decoration.node(primary.from, primary.to, {
              class: resolved
                ? 'tiptap-thread tiptap-thread--block tiptap-thread--resolved'
                : 'tiptap-thread tiptap-thread--block tiptap-thread--unresolved',
              'data-resource-comment-thread': primary.threadId,
              [THREADS_ATTR]: threadIds,
              ...(resolved ? { 'data-resource-comment-resolved': 'true' } : {}),
            });
          });
          if (
            draftImageRange &&
            isImageRange(state.doc, draftImageRange.from, draftImageRange.to)
          ) {
            decorations.push(
              Decoration.node(draftImageRange.from, draftImageRange.to, {
                class: 'resource-comment-draft-highlight',
              })
            );
          }
          return DecorationSet.create(state.doc, decorations);
        },
      },
      view: editorView => {
        paintImageCommentDom(editorView);
        return {
          update: paintImageCommentDom,
        };
      },
    }),
    (added, existing) => {
      // Preview must consume repeat clicks before comment navigation; both
      // precede the native image handler that consumes selection clicks.
      const previewIndex = existing.findIndex(
        plugin => plugin.spec.key === resourceImagePreviewKey
      );
      const index = previewIndex + 1;
      return [...existing.slice(0, index), added, ...existing.slice(index)];
    }
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
