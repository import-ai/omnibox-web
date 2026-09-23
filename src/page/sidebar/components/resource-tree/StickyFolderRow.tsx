import { ChevronDown } from 'lucide-react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import ResourceTypeIcon from '@/components/ResourceTypeIcon';
import { useStickyFolder } from '@/page/sidebar/hooks/useStickyFolder';
import { STICKY_FOLDER_HEIGHT } from '@/page/sidebar/stickyFolder';
import { useSidebarStore } from '@/page/sidebar/store';

export default function StickyFolderRow({
  scrollRef,
  namespaceId,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  namespaceId: string;
}) {
  const { t } = useTranslation();
  const { stickyId, collapse, locate } = useStickyFolder(
    scrollRef,
    namespaceId
  );
  const node = useSidebarStore(state =>
    stickyId ? state.nodes[stickyId] : undefined
  );
  if (!node) return null;
  const name = node.name || t('untitled');

  return (
    <div
      data-sticky-folder-id={node.id}
      className="pointer-events-none absolute inset-x-0 top-0 z-20 box-border flex items-center gap-1 border-b border-sidebar-border bg-sidebar px-3 text-sm text-sidebar-foreground shadow-sm"
      style={{
        height: STICKY_FOLDER_HEIGHT,
      }}
      onWheel={event => {
        if (event.ctrlKey || !scrollRef.current) return;
        const unit =
          event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? scrollRef.current.clientHeight
              : 1;
        scrollRef.current.scrollTop += event.deltaY * unit;
      }}
    >
      <button
        type="button"
        className="pointer-events-auto flex size-5 shrink-0 items-center justify-center rounded text-neutral-400 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-label={t('sidebar.collapse_folder', { name })}
        aria-expanded={true}
        onClick={() => collapse(node.id)}
      >
        <ChevronDown className="size-4" />
      </button>
      <ResourceTypeIcon expand resource={node} />
      <button
        type="button"
        className="pointer-events-auto min-w-0 flex-1 truncate rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-label={t('sidebar.locate_folder', { name })}
        title={name}
        onClick={() => locate(node.id)}
      >
        {name}
      </button>
    </div>
  );
}
