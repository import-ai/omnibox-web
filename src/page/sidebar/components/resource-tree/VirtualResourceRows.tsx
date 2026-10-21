import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useParams } from 'react-router-dom';

import { useRssFolderInitialSyncStatus } from '@/page/sidebar/components/rss-folder/useRssFolderLinkNames';
import { useNode } from '@/page/sidebar/store';
import {
  clearVirtualFolderSpans,
  setVirtualFolderLayout,
} from '@/page/sidebar/virtualFolderSpans';
import {
  type FlatResourceRow,
  RESOURCE_ROW_HEIGHT,
  RESOURCE_ROW_OVERSCAN,
  visibleRowRange,
} from '@/page/sidebar/virtualResourceTree';

import FolderEmptyState from './FolderEmptyState';

interface VirtualResourceRowsProps {
  listId: string;
  publishSpans?: boolean;
  renderEmpty?: (row: { depth: number; parentId: string }) => ReactNode;
  renderNode: (row: { depth: number; id: string }) => ReactNode;
  revealId?: string | null;
  rows: readonly FlatResourceRow[];
}

function listOffset(scroller: HTMLElement, list: HTMLElement) {
  return (
    list.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop
  );
}

export function VirtualResourceRows({
  listId,
  publishSpans = false,
  renderEmpty,
  renderNode,
  revealId,
  rows,
}: VirtualResourceRowsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [scroll, setScroll] = useState({ top: 0, height: 0, offset: 0 });

  useLayoutEffect(() => {
    const list = listRef.current;
    const scroller = list?.closest<HTMLElement>('[data-sidebar="content"]');
    if (!list || !scroller) return;

    const measure = () => {
      const next = {
        top: scroller.scrollTop,
        height: scroller.clientHeight,
        offset: listOffset(scroller, list),
      };
      setScroll(current =>
        current.top === next.top &&
        current.height === next.height &&
        current.offset === next.offset
          ? current
          : next
      );
    };

    measure();
    scroller.addEventListener('scroll', measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(scroller);
    resize.observe(list);
    return () => {
      scroller.removeEventListener('scroll', measure);
      resize.disconnect();
    };
  }, [rows.length]);

  useLayoutEffect(() => {
    if (!revealId) {
      revealedRef.current = null;
      return;
    }
    const index = rows.findIndex(
      row => row.kind === 'node' && row.id === revealId
    );
    if (index < 0) {
      if (revealedRef.current === revealId) revealedRef.current = null;
      return;
    }
    if (revealedRef.current === revealId) return;
    const list = listRef.current;
    const scroller = list?.closest<HTMLElement>('[data-sidebar="content"]');
    if (!list || !scroller) return;
    revealedRef.current = revealId;
    const top = listOffset(scroller, list) + index * RESOURCE_ROW_HEIGHT;
    const bottom = top + RESOURCE_ROW_HEIGHT;
    if (
      top >= scroller.scrollTop &&
      bottom <= scroller.scrollTop + scroller.clientHeight
    ) {
      return;
    }
    scroller.scrollTop = Math.max(
      0,
      top - (scroller.clientHeight - RESOURCE_ROW_HEIGHT) / 2
    );
    setScroll({
      top: scroller.scrollTop,
      height: scroller.clientHeight,
      offset: listOffset(scroller, list),
    });
  }, [revealId, rows]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const pin = (event: Event) => {
      const target = event.target;
      const row =
        target instanceof Element
          ? target.closest<HTMLElement>('[data-resource-row-id]')
          : null;
      setPinnedId(row?.dataset.resourceRowId || null);
    };
    const unpin = () => setPinnedId(null);
    list.addEventListener('dragstart', pin);
    window.addEventListener('dragend', unpin);
    window.addEventListener('drop', unpin);
    return () => {
      list.removeEventListener('dragstart', pin);
      window.removeEventListener('dragend', unpin);
      window.removeEventListener('drop', unpin);
    };
  }, []);

  useLayoutEffect(() => {
    if (!publishSpans) return;
    setVirtualFolderLayout(listId, rows);
  }, [listId, publishSpans, rows]);

  useLayoutEffect(() => {
    if (!publishSpans) return;
    return () => clearVirtualFolderSpans(listId);
  }, [listId, publishSpans]);

  const range = visibleRowRange(
    rows.length,
    scroll.top,
    scroll.height,
    scroll.offset,
    RESOURCE_ROW_HEIGHT,
    RESOURCE_ROW_OVERSCAN
  );
  const pinnedIndex = pinnedId
    ? rows.findIndex(row => row.kind === 'node' && row.id === pinnedId)
    : -1;
  const indexes: number[] = [];
  for (let index = range.start; index < range.end; index += 1)
    indexes.push(index);
  if (
    pinnedIndex >= 0 &&
    (pinnedIndex < range.start || pinnedIndex >= range.end)
  ) {
    indexes.push(pinnedIndex);
  }

  return (
    <div
      ref={listRef}
      data-virtual-resource-list={listId}
      className="relative"
      style={{ height: rows.length * RESOURCE_ROW_HEIGHT }}
    >
      {indexes.map(index => {
        const row = rows[index];
        return (
          <div
            key={row.id}
            className="absolute inset-x-0"
            style={{
              top: index * RESOURCE_ROW_HEIGHT,
              height: RESOURCE_ROW_HEIGHT,
            }}
          >
            {row.kind === 'node'
              ? renderNode(row)
              : renderEmpty?.({ depth: row.depth, parentId: row.parentId })}
          </div>
        );
      })}
    </div>
  );
}

export function VirtualEmptyFolderRow({
  depth,
  parentId,
}: {
  depth: number;
  parentId: string;
}) {
  const { namespace_id: namespaceId } = useParams();
  const node = useNode(parentId);
  const trackSync = node?.resourceType === 'rss_folder';
  const status = useRssFolderInitialSyncStatus(
    namespaceId,
    parentId,
    trackSync
  );
  const loading =
    trackSync &&
    (status === undefined || status === 'pending' || status === 'polling');

  return (
    <FolderEmptyState
      depth={depth}
      loading={loading}
      failed={status === 'failed'}
    />
  );
}
