import { FileText, Globe, Lightbulb, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import ResourceTypeIcon from '@/components/ResourceTypeIcon';
import type { ResourceMeta } from '@/interface';

import { type PrivateSearchResourceType, ToolType } from './types';

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

function ResourceTokenIcon({
  resource,
  contextType,
}: {
  resource: ResourceMeta;
  contextType?: PrivateSearchResourceType;
}) {
  return (
    <span className="mr-1 inline-flex size-4 align-[-0.125em] [&>svg]:size-4">
      <ResourceTypeIcon resource={resource} contextType={contextType} />
    </span>
  );
}

function TokenIcon({
  icon,
  resource,
  contextType,
}: {
  icon: InlineChatTokenIcon;
  resource?: ResourceMeta;
  contextType?: PrivateSearchResourceType;
}) {
  if (icon === 'resource') {
    return resource ? (
      <ResourceTokenIcon resource={resource} contextType={contextType} />
    ) : (
      <FileText className="mr-1 inline size-4 align-[-0.125em]" aria-hidden />
    );
  }
  return <ToolTokenIcon icon={icon} />;
}

export function InlineChatToken({
  icon,
  resource,
  contextType,
  children,
}: {
  icon: InlineChatTokenIcon;
  resource?: ResourceMeta;
  contextType?: PrivateSearchResourceType;
  children: ReactNode;
}) {
  return (
    <span className={inlineChatTokenClassName}>
      <TokenIcon icon={icon} resource={resource} contextType={contextType} />
      {children}
    </span>
  );
}
