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
  'inline align-baseline text-[#117bfa] dark:text-[#60a5fb]';

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
  return <Icon className="size-4" aria-hidden />;
}

function ResourceTokenIcon({
  resource,
  contextType,
}: {
  resource: ResourceMeta;
  contextType?: PrivateSearchResourceType;
}) {
  return (
    <span className="inline-flex size-4 [&>svg]:size-4">
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
  spacer,
  href,
  children,
}: {
  icon: InlineChatTokenIcon;
  resource?: ResourceMeta;
  contextType?: PrivateSearchResourceType;
  /** Composer overlay uses a fixed spacer; omit for read-only message display. */
  spacer?: string;
  href?: string;
  children: ReactNode;
}) {
  if (!spacer) {
    const content = (
      <>
        <span className="mr-1 inline-flex align-[-0.125em] [&>svg]:size-4">
          <TokenIcon
            icon={icon}
            resource={resource}
            contextType={contextType}
          />
        </span>
        {children}
      </>
    );

    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${inlineChatTokenClassName} hover:underline`}
        >
          {content}
        </a>
      );
    }

    return <span className={inlineChatTokenClassName}>{content}</span>;
  }

  return (
    <span className={inlineChatTokenClassName}>
      <span className="relative inline-block align-baseline">
        <span className="text-transparent">{spacer}</span>
        <span className="absolute inset-0 inline-flex items-center justify-center">
          <TokenIcon
            icon={icon}
            resource={resource}
            contextType={contextType}
          />
        </span>
      </span>
      {children}
    </span>
  );
}
