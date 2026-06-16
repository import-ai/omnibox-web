import { Extension, InputRule } from '@tiptap/core';
import type { MarkType } from '@tiptap/pm/model';

const MARKDOWN_LINK_REGEX = /^\[([^\]]+)]\(([^)\s]+)(?:\s+"([^"]+)")?\)$/;
const MARKDOWN_LINK_INPUT_REGEX =
  /(^|[^\w`])(\[([^\]]+)]\(([^)\s]+)(?:\s+"([^"]+)")?\))$/;

export interface MarkdownLinkMatch {
  href: string;
  index: number;
  label: string;
  matchedText: string;
  prefix: string;
  title?: string;
}

export function parseMarkdownLink(text: string) {
  const match = text.match(MARKDOWN_LINK_REGEX);

  if (!match) {
    return null;
  }

  const [, label, href, title] = match;

  return {
    href,
    label,
    title,
  };
}

export function getMarkdownLinkInputMatch(
  text: string
): MarkdownLinkMatch | null {
  const match = text.match(MARKDOWN_LINK_INPUT_REGEX);

  if (!match) {
    return null;
  }

  const [matchedText, prefix, , label, href, title] = match;

  return {
    href,
    index: match.index ?? 0,
    label,
    matchedText,
    prefix,
    title,
  };
}

function createLinkMark(
  linkMark: MarkType,
  match: Pick<MarkdownLinkMatch, 'href' | 'title'>
) {
  return linkMark.create(
    match.title
      ? { href: match.href, title: match.title }
      : { href: match.href }
  );
}

export function createMarkdownLinkInputRule() {
  return new InputRule({
    find: text => {
      const match = getMarkdownLinkInputMatch(text);

      if (!match) {
        return null;
      }

      return {
        data: match,
        index: match.index,
        text: match.matchedText,
      };
    },
    handler: ({ range, match, state }) => {
      const linkMatch = match.data as MarkdownLinkMatch | null;

      if (!linkMatch) {
        return null;
      }

      const prefixOffset = linkMatch.prefix.length;
      const replaceFrom = range.from + prefixOffset;

      state.tr.replaceWith(
        replaceFrom,
        range.to,
        state.schema.text(linkMatch.label, [
          createLinkMark(state.schema.marks.link, linkMatch),
        ])
      );
    },
  });
}

export const MarkdownLinkInput = Extension.create({
  name: 'markdownLinkInput',

  addInputRules() {
    return [createMarkdownLinkInputRule()];
  },
});
