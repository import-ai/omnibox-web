import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorProps, EditorView } from '@tiptap/pm/view';

export const resourceImagePreviewKey = new PluginKey('resourceImagePreview');

export function createResourceImagePreviewPlugin(
  onPreview: (image: HTMLImageElement, view: EditorView) => void,
  isActive: () => boolean
) {
  let pending: ReturnType<typeof setTimeout> | undefined;
  const observed = new WeakSet<MouseEvent>();
  let pointerSelection: { image: HTMLImageElement; selected: boolean } | null =
    null;
  const cancel = () => {
    clearTimeout(pending);
    pending = undefined;
  };
  const handleImageClick: NonNullable<EditorProps['handleClickOn']> = (
    view,
    _pos,
    node,
    nodePos,
    event
  ) => {
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
    // Snapshot the selection before mousedown: native pointer handling can
    // select the node before handleClickOn runs on mouseup.
    const selected =
      pointerSelection?.image === image
        ? pointerSelection.selected
        : view.state.selection instanceof NodeSelection &&
          view.state.selection.from === nodePos &&
          view.state.selection.node.type.name === 'image';
    pointerSelection = null;
    if (!selected) {
      cancel();
      observed.add(event);
      return false;
    }
    const ownsImage = () => {
      const nodeDOM = view.nodeDOM(nodePos);
      return (
        image.isConnected &&
        view.dom.contains(image) &&
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
        !(view.state.selection instanceof NodeSelection) ||
        view.state.selection.from !== nodePos ||
        view.state.selection.node.type.name !== 'image'
      )
        return;
      onPreview(image, view);
    }, 0);
    // Consume the second click so comment plugins cannot also navigate.
    return true;
  };
  return new Plugin({
    key: resourceImagePreviewKey,
    props: {
      handleDOMEvents: {
        mousedown(view, event) {
          pointerSelection = null;
          const image = event.target;
          if (image instanceof HTMLImageElement) {
            const selection = view.state.selection;
            pointerSelection = {
              image,
              selected:
                selection instanceof NodeSelection &&
                selection.node.type.name === 'image' &&
                Boolean(view.nodeDOM(selection.from)?.contains(image)),
            };
          }
          return false;
        },
      },
      handleClickOn: handleImageClick,
      handleDoubleClickOn: handleImageClick,
      handleTripleClickOn: handleImageClick,
    },
    view: () => ({ destroy: cancel }),
  });
}
