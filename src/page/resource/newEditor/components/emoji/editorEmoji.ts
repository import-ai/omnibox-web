import Emoji, {
  type EmojiItem,
  gitHubEmojis,
  shortcodeToEmoji,
} from '@tiptap/extension-emoji';
import type { JSONContent } from '@tiptap/react';

export interface ToolbarEmojiItem {
  emoji: string;
  label: string;
  shortcode: string;
}

const preferredShortcodes = [
  'grinning',
  'joy',
  'smiling_face_with_three_hearts',
  'heart_eyes',
  'sunglasses',
  'thinking',
  'sob',
  'rage',
  'thumbsup',
  'clap',
  'pray',
  'muscle',
  'tada',
  'fire',
  'sparkles',
  'bulb',
  'rocket',
  'eyes',
  'white_check_mark',
  'warning',
  'x',
  'heart',
  'broken_heart',
  'star',
  '100',
  'gift',
  'coffee',
  'pizza',
  'laptop',
  'memo',
  'calendar',
  'mag',
  'bell',
  'lock',
  'unlock',
  'link',
] as const;

const fallbackGroups = [
  'people & body',
  'animals & nature',
  'food & drink',
  'activities',
  'objects',
  'symbols',
] as const;

function getPrimaryShortcode(item: EmojiItem) {
  return item.shortcodes[0] ?? item.name;
}

function toToolbarEmojiItem(
  item: EmojiItem | null | undefined,
  shortcode?: string
): ToolbarEmojiItem | null {
  if (!item || !item.emoji) {
    return null;
  }

  return {
    emoji: item.emoji,
    label: item.name,
    shortcode: shortcode ?? getPrimaryShortcode(item),
  };
}

function uniqueToolbarEmojis(items: Array<ToolbarEmojiItem | null>) {
  const seen = new Set<string>();

  return items.filter((item): item is ToolbarEmojiItem => {
    if (!item || seen.has(item.emoji)) {
      return false;
    }

    seen.add(item.emoji);
    return true;
  });
}

export const editorEmojis = gitHubEmojis;

export const toolbarEmojis = uniqueToolbarEmojis([
  ...preferredShortcodes.map(shortcode =>
    toToolbarEmojiItem(shortcodeToEmoji(shortcode, editorEmojis), shortcode)
  ),
  ...fallbackGroups.flatMap(group =>
    editorEmojis
      .filter(item => item.group === group)
      .slice(0, 18)
      .map(item => toToolbarEmojiItem(item))
  ),
]).slice(0, 96);

export function renderEmojiMarkdown(node: JSONContent) {
  const name = node.attrs?.name;

  if (typeof name !== 'string') {
    return '';
  }

  const item = shortcodeToEmoji(name, editorEmojis);

  return item?.emoji ?? `:${name}:`;
}

export const EditorEmoji = Emoji.configure({
  emojis: editorEmojis,
  enableEmoticons: true,
}).extend({
  renderMarkdown: renderEmojiMarkdown,
});
