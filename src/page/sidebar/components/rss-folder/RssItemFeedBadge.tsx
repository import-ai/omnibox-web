import type { ReactNode } from 'react';

interface IProps {
  /** The feed's display name, when one could be resolved for this item. */
  name?: string;
  /** `sidebar` is the tree row's icon size, `page` the folder listing's. */
  size: 'sidebar' | 'page';
  /** Rendered instead whenever there is no initial to show. */
  fallback: ReactNode;
}

/**
 * An rss item is shown under the feed it came from rather than under the
 * generic link icon: a bordered square holding the first letter of the
 * subscription's name. Anything that leaves us without a letter — a non-rss
 * row, an unnamed or retired feed, a config we could not read — renders the
 * normal resource icon instead, so the row never shows an empty box.
 */
export function RssItemFeedBadge({ name, size, fallback }: IProps) {
  const initial = name?.trim().charAt(0).toUpperCase();
  if (!initial) {
    return <>{fallback}</>;
  }

  if (size === 'sidebar') {
    return (
      <span
        data-testid="rss-feed-badge"
        className="flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-muted-foreground/60 text-[10px] font-medium leading-none"
      >
        {initial}
      </span>
    );
  }

  return (
    <span className="flex h-7 shrink-0 items-center">
      <span
        data-testid="rss-feed-badge"
        className="flex size-5 items-center justify-center rounded-[4px] border border-muted-foreground/60 text-[11px] font-medium leading-none"
      >
        {initial}
      </span>
    </span>
  );
}
