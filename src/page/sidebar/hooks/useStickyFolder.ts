import { type RefObject, useLayoutEffect, useRef, useState } from 'react';

import {
  findStickyFolder,
  STICKY_FOLDER_HEIGHT,
  type StickyFolderBounds,
} from '../stickyFolder';
import { useSidebarStore } from '../store';

export function useStickyFolder(
  scrollRef: RefObject<HTMLDivElement | null>,
  namespaceId: string
) {
  const [stickyId, setStickyId] = useState<string | null>(null);
  const locateRef = useRef<(id: string, collapse: boolean) => void>(() => {});

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    let bounds: StickyFolderBounds[] = [];
    let dirty = true;
    let frame = 0;
    let pendingAnchor: { id: string; collapse: boolean } | null = null;
    let locatedId: string | null = null;
    let locatedScrollTop = 0;

    const getRow = (id: string) =>
      scroller.querySelector<HTMLElement>(
        `[data-resource-row-id="${CSS.escape(id)}"]`
      );
    const position = (element: HTMLElement) =>
      element.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop;

    const update = () => {
      frame = 0;
      if (pendingAnchor) {
        const { id, collapse } = pendingAnchor;
        const row = getRow(id);
        if (row) {
          scroller.scrollTop = Math.max(
            0,
            position(row) - STICKY_FOLDER_HEIGHT
          );
          locatedId = collapse ? null : id;
          locatedScrollTop = scroller.scrollTop;
          row.querySelector<HTMLButtonElement>('button')?.focus({
            preventScroll: true,
          });
        }
        pendingAnchor = null;
        dirty = true;
      }
      if (dirty) {
        const state = useSidebarStore.getState();
        bounds = [];
        scroller
          .querySelectorAll<HTMLElement>('[data-resource-tree-id]')
          .forEach(element => {
            const id = element.dataset.resourceTreeId!;
            const node = state.nodes[id];
            if (!node || !state.ui[id]?.expanded || !node.hasChildren) return;
            const row = getRow(id);
            if (!row || !row.getClientRects().length) return;
            bounds.push({
              id,
              top: position(row),
              bottom:
                position(element) + element.getBoundingClientRect().height,
              depth: Number(element.dataset.resourceDepth || 0),
            });
          });
        dirty = false;
      }
      if (locatedId && Math.abs(scroller.scrollTop - locatedScrollTop) < 0.5) {
        setStickyId(null);
        return;
      }
      locatedId = null;
      setStickyId(findStickyFolder(bounds, scroller.scrollTop));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const invalidate = () => {
      dirty = true;
      schedule();
    };
    const resize = new ResizeObserver(invalidate);
    resize.observe(scroller);
    const observeSections = () => {
      for (const child of scroller.children) resize.observe(child);
    };
    observeSections();
    const mutations = new MutationObserver(() => {
      observeSections();
      invalidate();
    });
    mutations.observe(scroller, { childList: true, subtree: true });
    const unsubscribe = useSidebarStore.subscribe((state, previous) => {
      if (
        state.nodes !== previous.nodes ||
        state.ui !== previous.ui ||
        state.spaceExpanded !== previous.spaceExpanded
      )
        invalidate();
    });
    scroller.addEventListener('scroll', schedule, { passive: true });
    locateRef.current = (id, collapse) => {
      pendingAnchor = { id, collapse };
      if (collapse) useSidebarStore.getState().collapse(id);
      invalidate();
    };
    update();
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      unsubscribe();
      scroller.removeEventListener('scroll', schedule);
      locateRef.current = () => {};
    };
  }, [namespaceId, scrollRef]);

  return {
    stickyId,
    collapse: (id: string) => locateRef.current(id, true),
    locate: (id: string) => locateRef.current(id, false),
  };
}
