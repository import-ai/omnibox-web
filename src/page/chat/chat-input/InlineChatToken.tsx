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

const iconPaths: Record<InlineChatTokenIcon, string[]> = {
  resource: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4',
  ],
  [ToolType.WEB_SEARCH]: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
    'M2 12h20',
    'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10',
  ],
  [ToolType.REASONING]: [
    'M15 14c.2-1 .7-1.7 1.5-2.5a4.8 4.8 0 1 0-6.8 0c.7.7 1.2 1.5 1.4 2.5',
    'M9 18h6',
    'M10 22h4',
  ],
};

function createSvgIcon(paths: string[]) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'mr-1 inline size-4 align-[-0.125em]');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  paths.forEach(value => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', value);
    svg.appendChild(path);
  });

  return svg;
}

function Icon({ icon }: { icon: InlineChatTokenIcon }) {
  return (
    <svg
      className="mr-1 inline size-4 align-[-0.125em]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {iconPaths[icon].map(path => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function ResourceTokenIcon({ resource }: { resource: ResourceMeta }) {
  return (
    <span className="mr-1 inline-flex size-4 align-[-0.125em] [&>svg]:size-4">
      <ResourceIcon expand={false} resource={resource} />
    </span>
  );
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
      {icon === 'resource' && resource ? (
        <ResourceTokenIcon resource={resource} />
      ) : (
        <Icon icon={icon} />
      )}
      {children}
    </span>
  );
}

export function createInlineChatTokenIconElement(
  icon: InlineChatTokenIcon,
  resource?: ResourceMeta
) {
  if (icon === 'resource' && resource) {
    const container = document.createElement('span');
    flushSync(() => {
      createRoot(container).render(<ResourceTokenIcon resource={resource} />);
    });
    return container;
  }

  return createSvgIcon(iconPaths[icon]);
}
