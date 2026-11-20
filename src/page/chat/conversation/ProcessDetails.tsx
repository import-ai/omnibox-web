import { ChevronRight } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';

import { DetailLoadState, useMessageDetails } from './MessageDetailsContext';

export function ProcessDetails({
  id,
  ids,
  title,
  running = false,
  children,
}: {
  id?: string;
  ids: string[];
  title: string;
  /** The turn still runs; the summary shows progress instead of a result. */
  running?: boolean;
  children: () => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const details = useMessageDetails();
  const load = () => {
    void details.load(ids);
  };
  return (
    <details
      id={id}
      className="group border-b border-border/60 pb-3"
      onToggle={event => {
        const expanded = event.currentTarget.open;
        setOpen(expanded);
        if (expanded) load();
      }}
    >
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 py-3 text-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        {running && <Spinner aria-hidden="true" className="size-3.5" />}
        <span>{title}</span>
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
      </summary>
      {open && (
        <div className="space-y-4 pb-3">
          <DetailLoadState {...details} retry={load} />
          {!details.loading && !details.error && children()}
        </div>
      )}
    </details>
  );
}
