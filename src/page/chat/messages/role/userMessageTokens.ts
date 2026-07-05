import type { ResourceMeta } from '@/interface';

import {
  type ChatTool,
  type PrivateSearchResource,
  ToolType,
} from '../../chat-input/types';

type UserMessageTokenSegment =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'resource';
      text: string;
    };

export function getUserMessageResources(tools?: ChatTool[]) {
  const resourcesByName = new Map<string, PrivateSearchResource>();

  (tools ?? [])
    .flatMap(tool =>
      tool.name === ToolType.PRIVATE_SEARCH ? (tool.resources ?? []) : []
    )
    .forEach(resource => {
      if (resource.name && !resourcesByName.has(resource.name)) {
        resourcesByName.set(resource.name, resource);
      }
    });

  return Array.from(resourcesByName.values()).sort(
    (a, b) => b.name.length - a.name.length
  );
}

export function resourceMetaFromPrivateSearchResource(
  resource: PrivateSearchResource
): ResourceMeta {
  const resourceType =
    resource.resource_type ?? (resource.type === 'folder' ? 'folder' : 'file');
  return {
    id: resource.id,
    name: resource.name,
    parent_id: null,
    resource_type: resourceType,
    attrs:
      resource.attrs ??
      (resourceType === 'file' ? { original_name: resource.name } : undefined),
  };
}

export function splitUserMessageResourceTokens(
  text: string,
  resourceNames: string[]
): UserMessageTokenSegment[] {
  if (resourceNames.length === 0 || text.length === 0) {
    return [{ type: 'text', text }];
  }

  const resourceNameSet = new Set(resourceNames);
  const pattern = new RegExp(`(${resourceNames.map(escapeRegExp).join('|')})`);
  return text
    .split(pattern)
    .filter(Boolean)
    .map<UserMessageTokenSegment>(part => ({
      type: resourceNameSet.has(part) ? 'resource' : 'text',
      text: part,
    }));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function resourceTokenHtml(resource: PrivateSearchResource) {
  const label = escapeHtml(resource.name);
  const resourceType =
    resource.resource_type ?? (resource.type === 'folder' ? 'folder' : 'file');
  const url =
    typeof resource.attrs?.url === 'string'
      ? escapeHtml(resource.attrs.url)
      : '';

  return [
    '<span contenteditable="false"',
    ' data-chat-token="resource"',
    ` data-label="${label}"`,
    ` data-resource-id="${escapeHtml(resource.id)}"`,
    ` data-resource-name="${label}"`,
    ` data-resource-type="${resourceType}"`,
    ' data-parent-id=""',
    ` data-context-type="${resource.type}"`,
    url ? ` data-resource-url="${url}"` : '',
    ` title="${label}"`,
    `>${label}</span>`,
  ].join('');
}

export function createUserMessageCopyHtml(
  text: string,
  tools?: ChatTool[]
): string | undefined {
  const resources = getUserMessageResources(tools);
  if (resources.length === 0 || text.length === 0) return undefined;

  const resourceByName = new Map(
    resources.map(resource => [resource.name, resource])
  );
  const resourceNames = resources.map(resource => resource.name);

  return text
    .split('\n')
    .map(line =>
      splitUserMessageResourceTokens(line, resourceNames)
        .map(segment => {
          if (segment.type === 'text') return escapeHtml(segment.text);
          const resource = resourceByName.get(segment.text);
          return resource
            ? resourceTokenHtml(resource)
            : escapeHtml(segment.text);
        })
        .join('')
    )
    .join('<br>');
}
