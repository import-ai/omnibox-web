import { Plugin, PluginKey } from '@tiptap/pm/state';
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
