import type { ResourceMeta } from '@/interface';

import { getTextChange, normalizeSelection } from './composerTextRanges';
import type { IResTypeContext, PrivateSearchResourceType } from './types';

export interface TextSelection {
  start: number;
  end: number;
}

export interface ComposerMention {
  id: string;
  label: string;
  start: number;
  end: number;
  type: PrivateSearchResourceType;
  resource: ResourceMeta;
}

export interface ComposerDocument {
  text: string;
  mentions: ComposerMention[];
}

export interface InsertResourceMentionResult extends ComposerDocument {
  replacedRange: TextSelection;
  selection: TextSelection;
}

export interface DeleteResourceMentionResult extends ComposerDocument {
  mention: ComposerMention;
  selection: TextSelection;
}

export const resourceTokenSpacer = '\u2007\u2007\u2007';

export function createResourceMentionText(label: string): string {
  return `${resourceTokenSpacer}${label}`;
}

export function getResourceContextType(
  resource: ResourceMeta
): PrivateSearchResourceType {
  return resource.resource_type === 'folder' ||
    resource.resource_type === 'smart_folder'
    ? 'folder'
    : 'resource';
}

export function resourceContextKey(item: IResTypeContext): string {
  return `${item.resource.id}:${item.type}`;
}

export function mentionKey(mention: ComposerMention): string {
  return `${mention.resource.id}:${mention.type}`;
}

export function sameResourceContexts(
  first: IResTypeContext[],
  second: IResTypeContext[]
): boolean {
  if (first.length !== second.length) return false;
  return first.every((item, index) => {
    const other = second[index];
    return (
      item.type === other.type &&
      item.resource.id === other.resource.id &&
      item.resource.name === other.resource.name
    );
  });
}

export function sameMentions(
  first: ComposerMention[],
  second: ComposerMention[]
): boolean {
  if (first.length !== second.length) return false;
  return first.every((mention, index) => {
    const other = second[index];
    return (
      mentionKey(mention) === mentionKey(other) &&
      mention.label === other.label &&
      mention.start === other.start &&
      mention.end === other.end
    );
  });
}

/** Converts the composer mention model into the submit API resource payload. */
export function mentionsToResources(
  mentions: ComposerMention[]
): IResTypeContext[] {
  const resources = new Map<string, IResTypeContext>();
  mentions.forEach(mention => {
    resources.set(mentionKey(mention), {
      type: mention.type,
      resource: mention.resource,
    });
  });
  return Array.from(resources.values());
}

/** Keeps mention ranges stable after ordinary textarea edits. */
export function updateMentionsForTextChange(
  previousText: string,
  nextText: string,
  mentions: ComposerMention[]
): ComposerMention[] {
  const change = getTextChange(previousText, nextText);
  return mentions
    .map(mention => shiftMention(mention, change, nextText))
    .filter((mention): mention is ComposerMention => Boolean(mention))
    .sort((a, b) => a.start - b.start);
}

export function deleteResourceMention(
  document: ComposerDocument,
  selection: TextSelection,
  key: string
): DeleteResourceMentionResult | null {
  const target = mentionRangeForDeletion(selection, key, document.mentions);
  if (!target) return null;

  return removeMention(document, target);
}

export function mentionRangeForDeletion(
  selection: TextSelection,
  key: string,
  mentions: ComposerMention[]
): ComposerMention | undefined {
  if (key !== 'Backspace' && key !== 'Delete') return undefined;

  if (selection.start !== selection.end) {
    return mentions.find(mention =>
      selectionOverlapsMention(selection, mention)
    );
  }

  if (key === 'Backspace') return mentionBeforeCaret(selection.start, mentions);
  return mentionAfterCaret(selection.start, mentions);
}

/** Inserts a resource label as text and records its range as resource metadata. */
export function insertResourceMention(
  document: ComposerDocument,
  resource: ResourceMeta,
  selection: TextSelection,
  fallbackLabel: string
): InsertResourceMentionResult {
  const label = resource.name || fallbackLabel;
  const tokenText = createResourceMentionText(label);
  const range = normalizeSelection(selection, document.text.length);
  const text =
    document.text.slice(0, range.start) +
    tokenText +
    document.text.slice(range.end);
  const shiftedMentions = updateMentionsForTextChange(
    document.text,
    text,
    document.mentions
  );
  const mention = createMention(resource, label, range.start);

  return {
    text,
    mentions: [...shiftedMentions, mention].sort((a, b) => a.start - b.start),
    replacedRange: range,
    selection: {
      start: mention.end,
      end: mention.end,
    },
  };
}

/** Appends resources that are selected outside the textarea, preserving text. */
export function appendMissingResourceMentions(
  document: ComposerDocument,
  resources: IResTypeContext[],
  fallbackLabel: string
): ComposerDocument {
  let text = document.text;
  const mentions = document.mentions.map(mention => ({ ...mention }));
  const existingKeys = new Set(mentions.map(mentionKey));

  resources.forEach(item => {
    const key = resourceContextKey(item);
    if (existingKeys.has(key)) return;

    const sameResourceMention = mentions.find(
      mention => mention.resource.id === item.resource.id
    );
    if (sameResourceMention) {
      existingKeys.delete(mentionKey(sameResourceMention));
      sameResourceMention.id = `${item.resource.id}:${item.type}`;
      sameResourceMention.type = item.type;
      sameResourceMention.resource = item.resource;
      existingKeys.add(key);
      return;
    }

    const label = item.resource.name || fallbackLabel;
    const tokenText = createResourceMentionText(label);
    const prefix = text.length > 0 && !/\s$/.test(text) ? ' ' : '';
    const start = text.length + prefix.length;
    text += `${prefix}${tokenText} `;
    mentions.push(createMention(item.resource, label, start, item.type));
    existingKeys.add(key);
  });

  return {
    text,
    mentions: mentions.sort((a, b) => a.start - b.start),
  };
}

function removeMention(
  document: ComposerDocument,
  mention: ComposerMention
): DeleteResourceMentionResult {
  const text =
    document.text.slice(0, mention.start) + document.text.slice(mention.end);
  const removedLength = mention.end - mention.start;
  const mentions = document.mentions
    .filter(item => item !== mention)
    .map(item =>
      item.start > mention.start
        ? {
            ...item,
            start: item.start - removedLength,
            end: item.end - removedLength,
          }
        : item
    );

  return {
    text,
    mention,
    mentions,
    selection: { start: mention.start, end: mention.start },
  };
}

function mentionBeforeCaret(
  position: number,
  mentions: ComposerMention[]
): ComposerMention | undefined {
  return mentions.find(
    mention => position > mention.start && position <= mention.end
  );
}

function mentionAfterCaret(
  position: number,
  mentions: ComposerMention[]
): ComposerMention | undefined {
  return mentions.find(
    mention => position >= mention.start && position < mention.end
  );
}

function selectionOverlapsMention(
  selection: TextSelection,
  mention: ComposerMention
): boolean {
  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);
  return start < mention.end && end > mention.start;
}

function createMention(
  resource: ResourceMeta,
  label: string,
  start: number,
  type = getResourceContextType(resource)
): ComposerMention {
  const tokenText = createResourceMentionText(label);
  return {
    id: `${resource.id}:${type}`,
    label,
    start,
    end: start + tokenText.length,
    type,
    resource,
  };
}

function shiftMention(
  mention: ComposerMention,
  change: ReturnType<typeof getTextChange>,
  nextText: string
): ComposerMention | null {
  if (mention.end <= change.start) return validateMention(mention, nextText);
  if (mention.start >= change.end) {
    return validateMention(
      {
        ...mention,
        start: mention.start + change.delta,
        end: mention.end + change.delta,
      },
      nextText
    );
  }
  return null;
}

function validateMention(
  mention: ComposerMention,
  text: string
): ComposerMention | null {
  return text.slice(mention.start, mention.end) ===
    createResourceMentionText(mention.label)
    ? mention
    : null;
}
