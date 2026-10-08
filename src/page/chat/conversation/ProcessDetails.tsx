import { ChevronRight } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { DetailLoadState, useMessageDetails } from './MessageDetailsContext';

export function ProcessDetails({
  ids,
  title,
  children,
}: {
  ids: string[];
  title: string;
  children: () => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const details = useMessageDetails();
  const load = () => {
    void details.load(ids);
  };
  return (
    <details
      className="group border-b border-border/60 pb-3"
      onToggle={event => {
        const expanded = event.currentTarget.open;
        setOpen(expanded);
        if (expanded) load();
      }}
    >
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 py-3 text-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
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
