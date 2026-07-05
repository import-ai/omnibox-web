import { FileText, Globe, Lightbulb, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import ResourceIcon from '@/assets/icons/ResourceIcon';
import type { ResourceMeta } from '@/interface';

import { ToolType } from './types';

export type InlineChatTokenIcon =
  | 'resource'
  | ToolType.WEB_SEARCH
  | ToolType.REASONING;

export const inlineChatTokenClassName =
  'mx-0.5 inline break-all align-baseline text-[#117bfa] [overflow-wrap:anywhere] dark:text-[#60a5fb]';

const toolIcon: Record<Exclude<InlineChatTokenIcon, 'resource'>, LucideIcon> = {
  [ToolType.WEB_SEARCH]: Globe,
  [ToolType.REASONING]: Lightbulb,
};

function ToolTokenIcon({
  icon,
}: {
  icon: Exclude<InlineChatTokenIcon, 'resource'>;
}) {
  const Icon = toolIcon[icon];
  return <Icon className="mr-1 inline size-4 align-[-0.125em]" aria-hidden />;
}

function ResourceTokenIcon({ resource }: { resource: ResourceMeta }) {
  return (
    <span className="mr-1 inline-flex size-4 align-[-0.125em] [&>svg]:size-4">
      <ResourceIcon expand={false} resource={resource} />
    </span>
  );
}

function TokenIcon({
  icon,
  resource,
}: {
  icon: InlineChatTokenIcon;
  resource?: ResourceMeta;
}) {
  if (icon === 'resource') {
    return resource ? (
      <ResourceTokenIcon resource={resource} />
    ) : (
      <FileText className="mr-1 inline size-4 align-[-0.125em]" aria-hidden />
    );
  }
  return <ToolTokenIcon icon={icon} />;
}

export function InlineChatToken({
  icon,
  resource,
  children,
}: {
  icon: InlineChatTokenIcon;
  resource?: ResourceMeta;
  children: ReactNode;
}) {
  return (
    <span className={inlineChatTokenClassName}>
      <TokenIcon icon={icon} resource={resource} />
      {children}
    </span>
  );
}

export function createInlineChatTokenIconElement(
  icon: InlineChatTokenIcon,
  resource?: ResourceMeta
) {
  const container = document.createElement('span');
  flushSync(() => {
    createRoot(container).render(<TokenIcon icon={icon} resource={resource} />);
  });
  return container;
}
