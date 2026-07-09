import type { ResourceMeta } from '@/interface';

import {
  type ChatMessageDisplayPart,
  type ChatTool,
  type PrivateSearchResource,
  ToolType,
} from '../../chat-input/types';

export type UserMessageToolToken = Exclude<ToolType, ToolType.PRIVATE_SEARCH>;

type ToolLabelGetter = (tool: UserMessageToolToken) => string;

type UserMessageTokenSegment =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'resource';
      text: string;
    };

export type UserMessageDisplaySegment =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'resource';
      resource: PrivateSearchResource;
    }
  | {
      type: 'tool';
      tool: UserMessageToolToken;
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

/**
 * Extract tools that should remain visible on the sent user message.
 */
export function getUserMessageToolTokens(
  tools?: ChatTool[],
  enableThinking = false
): UserMessageToolToken[] {
  const visibleTools: UserMessageToolToken[] = [];

  if (tools?.some(tool => tool.name === ToolType.WEB_SEARCH)) {
    visibleTools.push(ToolType.WEB_SEARCH);
  }
  if (enableThinking || tools?.some(tool => tool.name === ToolType.REASONING)) {
    visibleTools.push(ToolType.REASONING);
  }

  return visibleTools;
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

function defaultToolLabel(tool: UserMessageToolToken) {
  return tool;
}

function toolTokenHtml(
  tool: UserMessageToolToken,
  getToolLabel: ToolLabelGetter
) {
  const label = escapeHtml(getToolLabel(tool));

  return [
    '<span contenteditable="false"',
    ' data-chat-token="tool"',
    ` data-tool-name="${tool}"`,
    ` data-label="${label}"`,
    ` title="${label}"`,
    `>${label}</span>`,
  ].join('');
}

function appendToolTokensHtml(
  html: string,
  tools: UserMessageToolToken[],
  getToolLabel: ToolLabelGetter
) {
  if (tools.length === 0) return html;
  const toolHtml = tools
    .map(tool => toolTokenHtml(tool, getToolLabel))
    .join('');
  return html ? `${html} ${toolHtml}` : toolHtml;
}

function displayPartHtml(
  part: ChatMessageDisplayPart,
  getToolLabel: ToolLabelGetter
) {
  if (part.type === 'text') return escapeHtml(part.text).replace(/\n/g, '<br>');
  if (part.type === 'resource') return resourceTokenHtml(part.resource);
  return toolTokenHtml(part.tool, getToolLabel);
}

function hasDisplayTokens(displayParts?: ChatMessageDisplayPart[]) {
  return displayParts?.some(part => part.type !== 'text') ?? false;
}

export function splitDisplayPartsByLine(
  displayParts: ChatMessageDisplayPart[]
): UserMessageDisplaySegment[][] {
  const lines: UserMessageDisplaySegment[][] = [[]];

  displayParts.forEach(part => {
    if (part.type !== 'text') {
      lines[lines.length - 1].push(part);
      return;
    }

    part.text.split('\n').forEach((text, index) => {
      if (index > 0) lines.push([]);
      if (text) lines[lines.length - 1].push({ type: 'text', text });
    });
  });

  return lines;
}

export function createUserMessageCopyHtml(
  text: string,
  tools?: ChatTool[],
  enableThinking = false,
  getToolLabel: ToolLabelGetter = defaultToolLabel,
  displayParts?: ChatMessageDisplayPart[]
): string | undefined {
  if (hasDisplayTokens(displayParts)) {
    return displayParts
      ?.map(part => displayPartHtml(part, getToolLabel))
      .join('');
  }

  const resources = getUserMessageResources(tools);
  const toolTokens = getUserMessageToolTokens(tools, enableThinking);
  if (resources.length === 0 && toolTokens.length === 0) return undefined;

  const resourceByName = new Map(
    resources.map(resource => [resource.name, resource])
  );
  const resourceNames = resources.map(resource => resource.name);

  const lines = text.split('\n');
  return lines
    .map((line, index) => {
      const lineHtml = splitUserMessageResourceTokens(line, resourceNames)
        .map(segment => {
          if (segment.type === 'text') return escapeHtml(segment.text);
          const resource = resourceByName.get(segment.text);
          return resource
            ? resourceTokenHtml(resource)
            : escapeHtml(segment.text);
        })
        .join('');

      return index === lines.length - 1
        ? appendToolTokensHtml(lineHtml, toolTokens, getToolLabel)
        : lineHtml;
    })
    .join('<br>');
}
