import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export const resourceImagePreviewKey = new PluginKey('resourceImagePreview');

export function createResourceImagePreviewPlugin(
  onPreview: (image: HTMLImageElement, view: EditorView) => void,
  isActive: () => boolean
) {
  let pending: ReturnType<typeof setTimeout> | undefined;
  const observed = new WeakSet<MouseEvent>();
  const cancel = () => {
    clearTimeout(pending);
    pending = undefined;
  };
  return new Plugin({
    key: resourceImagePreviewKey,
    props: {
      handleClickOn(view, _pos, node, nodePos, event) {
        const image = event.target;
        if (
          node.type.name !== 'image' ||
          !(image instanceof HTMLImageElement) ||
          event.button !== 0 ||
          event.shiftKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          observed.has(event)
        )
          return false;
        const ownsImage = () => {
          const nodeDOM = view.nodeDOM(nodePos);
          const cell = image.closest('td, th');
          return (
            image.isConnected &&
            !!cell &&
            view.dom.contains(cell) &&
            !!nodeDOM?.contains(image)
          );
        };
        const src = image.currentSrc || image.src;
        if (
          !isActive() ||
          !ownsImage() ||
          !src ||
          !image.complete ||
          image.naturalWidth <= 0
        )
          return false;
        observed.add(event);
        cancel();
        pending = setTimeout(() => {
          pending = undefined;
          if (
            !isActive() ||
            view.isDestroyed ||
            !ownsImage() ||
            !image.complete ||
            image.naturalWidth <= 0 ||
            (image.currentSrc || image.src) !== src
          )
            return;
          if (
            view.editable &&
            (!(view.state.selection instanceof NodeSelection) ||
              view.state.selection.from !== nodePos ||
              view.state.selection.node.type.name !== 'image')
          )
            return;
          onPreview(image, view);
        }, 0);
        return false;
      },
    },
    view: () => ({ destroy: cancel }),
  });
}
