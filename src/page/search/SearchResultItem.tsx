import type { MouseEventHandler, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import {
  searchResultRowWithoutPreviewClassName,
  searchResultRowWithPreviewClassName,
} from './searchResultLayout';

function appAbsoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

export function SearchResultAnchor({
  children,
  onClick,
  path,
  preview,
}: {
  children: ReactNode;
  onClick: MouseEventHandler<HTMLAnchorElement>;
  path: string;
  preview?: boolean;
}) {
  return (
    <a
      href={appAbsoluteUrl(path)}
      target="_blank"
      rel="noopener noreferrer"
      className={
        preview
          ? searchResultRowWithPreviewClassName
          : searchResultRowWithoutPreviewClassName
      }
      onClick={onClick}
    >
      {children}
    </a>
  );
}

export function SearchResultContent({
  icon,
  preview,
  title,
  titleClassName,
}: {
  icon: ReactNode;
  preview?: string;
  title: string;
  titleClassName?: string;
}) {
  return (
    <>
      <div className="flex w-full items-center gap-2">
        <div className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4">
          {icon}
        </div>
        <div
          className={cn(
            'min-w-0 flex-1 truncate text-base font-medium leading-6 text-foreground',
            titleClassName
          )}
        >
          {title}
        </div>
      </div>
      {preview ? (
        <div className="ml-6 line-clamp-2 text-sm leading-[22px] text-[rgba(26,26,26,0.36)] dark:text-neutral-500">
          {preview}
        </div>
      ) : null}
    </>
  );
}
