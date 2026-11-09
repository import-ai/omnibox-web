import type { TFunction } from 'i18next';

import type { ResourceMeta } from '@/interface';
import { pathI18n, trimMiddle } from '@/lib/toolArgs.ts';

import { WEB_SEARCH_QUERY_TOKEN } from '../../chat-input/composerQuery';
import {
  type ChatMessageDisplayPart,
  type ChatTool,
  type PrivateSearchResource,
  ToolType,
} from '../../chat-input/types';

export type UserMessageToolToken = Exclude<ToolType, ToolType.PRIVATE_SEARCH>;

export type UserMessageImagePart = Extract<
  ChatMessageDisplayPart,
  { type: 'image' }
>;

export function getUserMessageImages(
  displayParts?: ChatMessageDisplayPart[] | null
): UserMessageImagePart[] {
  return (displayParts ?? []).filter(
    (part): part is UserMessageImagePart => part.type === 'image'
  );
}

export function withoutUserMessageImages(
  displayParts?: ChatMessageDisplayPart[] | null
): ChatMessageDisplayPart[] | undefined {
  if (!displayParts) return undefined;
  return displayParts.filter(part => part.type !== 'image');
}

type ToolLabelGetter = (tool: UserMessageToolToken) => string;

type UserMessageTokenSegment =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'resource';
      text: string;
      resource: PrivateSearchResource;
    }
  | {
      type: 'tool';
      tool: UserMessageToolToken;
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
  const resourcesById = new Map<string, PrivateSearchResource>();

  (tools ?? [])
    .flatMap(tool =>
      tool.name === ToolType.PRIVATE_SEARCH ? (tool.resources ?? []) : []
    )
    .forEach(resource => {
      if (resource.id && !resourcesById.has(resource.id)) {
        resourcesById.set(resource.id, resource);
      }
    });

  return Array.from(resourcesById.values()).sort(
    (a, b) => b.name.length - a.name.length
  );
}

/** Whether the user bubble already renders resource/folder pills. */
export function hasVisibleUserMessageResources(
  content: string | undefined,
  tools?: ChatTool[],
  displayParts?: ChatMessageDisplayPart[] | null
): boolean {
  if (displayParts?.some(part => part.type === 'resource')) {
    return true;
  }

  const resources = getUserMessageResources(tools);
  if (resources.length === 0) return false;

  return splitUserMessageResourceTokens(content ?? '', resources).some(
    segment => segment.type === 'resource'
  );
}

/** IDs to resolve for message pills / user_context tip labels. */
export function collectUserMessageResourceIds(
  resources: PrivateSearchResource[],
  selectedResources?: string[]
): string[] {
  const selectedIds = (selectedResources ?? []).filter(
    value => !!value && !value.includes('/')
  );

  return Array.from(
    new Set([
      ...resources.map(resource => resource.id).filter(Boolean),
      ...selectedIds,
    ])
  ).sort();
}

export function buildResourceNameById(
  resources: PrivateSearchResource[],
  metaById: Record<string, Pick<ResourceMeta, 'name'> | undefined>
): Record<string, string> {
  const nameById: Record<string, string> = {};

  for (const resource of resources) {
    if (resource.id && resource.name) {
      nameById[resource.id] = resource.name;
    }
  }

  for (const [id, meta] of Object.entries(metaById)) {
    if (meta?.name) {
      nameById[id] = meta.name;
    }
  }

  return nameById;
}

/** Prefer resource name; fall back to path i18n. Unresolved IDs return null. */
export function formatUserContextResourceLabel(
  value: string,
  nameById: Record<string, string>,
  t: TFunction
): string | null {
  const name = nameById[value];
  if (name) return trimMiddle(name);
  // Paths keep path i18n; bare IDs wait for metadata instead of flashing the id.
  if (value.includes('/')) return trimMiddle(pathI18n(value, t));
  return null;
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
  resources: PrivateSearchResource[]
): UserMessageTokenSegment[] {
  if (text.length === 0) {
    return [{ type: 'text', text }];
  }

  const resourceById = new Map(
    resources.map(resource => [resource.id, resource])
  );
  const resourceByName = new Map<string, PrivateSearchResource | null>();
  resources.forEach(resource => {
    if (!resource.name) return;
    const existing = resourceByName.get(resource.name);
    resourceByName.set(
      resource.name,
      existing === undefined || existing?.id === resource.id ? resource : null
    );
  });
  const names = Array.from(resourceByName.keys())
    .filter(name => resourceByName.get(name))
    .sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    [
      escapeRegExp(WEB_SEARCH_QUERY_TOKEN),
      '!?\\[',
      ...names.map(escapeRegExp),
    ].join('|'),
    'g'
  );
  const segments: UserMessageTokenSegment[] = [];
  const appendText = (value: string) => {
    if (!value) return;
    const previous = segments[segments.length - 1];
    if (previous?.type === 'text') previous.text += value;
    else segments.push({ type: 'text', text: value });
  };
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const matchIndex = match.index;
    appendText(text.slice(cursor, matchIndex));
    let token = match[0];
    if (token === WEB_SEARCH_QUERY_TOKEN) {
      segments.push({ type: 'tool', tool: ToolType.WEB_SEARCH });
    } else if (token === '[' || token === '![') {
      const labelStart = matchIndex + token.length - 1;
      const label = scanBracketedText(text, labelStart, '[', ']');
      const hasTarget = label.closed && text[label.end] === '(';
      const target = hasTarget
        ? scanBracketedText(text, label.end, '(', ')')
        : undefined;
      // A complete bare filename may itself begin with brackets.
      const legacyName =
        label.closed && !hasTarget
          ? names.find(name => text.startsWith(name, matchIndex))
          : undefined;
      const end = legacyName
        ? matchIndex + legacyName.length
        : (target?.end ?? label.end);
      token = text.slice(matchIndex, end);
      const targetId = target?.closed
        ? text.slice(label.end + 1, target.end - 1)
        : '';
      const resource = legacyName
        ? resourceByName.get(legacyName)
        : !token.startsWith('!') && targetId.startsWith('#')
          ? resourceById.get(targetId.slice(1))
          : undefined;
      if (resource) {
        segments.push({
          type: 'resource',
          text:
            legacyName ??
            (text
              .slice(labelStart + 1, label.end - 1)
              .replace(/\\([\[\]\\])/g, '$1') ||
              resource.name),
          resource,
        });
      } else appendText(token);
    } else {
      const resource = resourceByName.get(token);
      if (resource) segments.push({ type: 'resource', text: token, resource });
      else appendText(token);
    }
    cursor = matchIndex + token.length;
    pattern.lastIndex = cursor;
  }
  appendText(text.slice(cursor));
  return segments;
}

// Keep nested, escaped, unknown, and incomplete Markdown spans intact before
// attempting legacy bare-name matching inside the surrounding text.
function scanBracketedText(
  text: string,
  start: number,
  opening: string,
  closing: string
) {
  let depth = 1;
  let end = start + 1;
  while (end < text.length && text[end] !== '\n') {
    const char = text[end++];
    if (char === '\\' && end < text.length && text[end] !== '\n') end++;
    else if (char === opening) depth++;
    else if (char === closing && --depth === 0) return { end, closed: true };
  }
  return { end, closed: false };
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

function resourceTokenHtml(
  resource: PrivateSearchResource,
  text = resource.name
) {
  const label = escapeHtml(text);
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
  getToolLabel: ToolLabelGetter,
  untitledLabel: string
) {
  if (part.type === 'text') return escapeHtml(part.text).replace(/\n/g, '<br>');
  if (part.type === 'resource')
    return resourceTokenHtml(
      part.resource,
      part.resource.name || untitledLabel
    );
  if (part.type === 'image') {
    return `<img src="${escapeHtml(part.preview_url)}" alt="${escapeHtml(part.name)}" class="max-h-40 max-w-40 rounded-md object-contain" />`;
  }
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
    if (part.type === 'image') return;
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
  displayParts?: ChatMessageDisplayPart[],
  untitledLabel = 'Untitled'
): string | undefined {
  if (hasDisplayTokens(displayParts)) {
    return displayParts
      ?.map(part => displayPartHtml(part, getToolLabel, untitledLabel))
      .join('');
  }

  const resources = getUserMessageResources(tools);
  const toolTokens = getUserMessageToolTokens(tools, enableThinking).filter(
    tool =>
      tool !== ToolType.WEB_SEARCH || !text.includes(WEB_SEARCH_QUERY_TOKEN)
  );
  if (
    resources.length === 0 &&
    toolTokens.length === 0 &&
    !text.includes(WEB_SEARCH_QUERY_TOKEN)
  )
    return undefined;

  const lines = text.split('\n');
  return lines
    .map((line, index) => {
      const lineHtml = splitUserMessageResourceTokens(line, resources)
        .map(segment => {
          if (segment.type === 'tool')
            return toolTokenHtml(segment.tool, getToolLabel);
          if (segment.type === 'text') return escapeHtml(segment.text);
          return resourceTokenHtml(
            segment.resource,
            segment.text || untitledLabel
          );
        })
        .join('');

      return index === lines.length - 1
        ? appendToolTokensHtml(lineHtml, toolTokens, getToolLabel)
        : lineHtml;
    })
    .join('<br>');
}
