import { InputRule } from '@tiptap/core';
import Code from '@tiptap/extension-code';
import type { JSONContent } from '@tiptap/react';

import { parseMarkdownLink } from '../markdown-link/markdownLinkInput';

const MARKDOWN_LINK_CODE_INPUT_REGEX =
  /`(\[([^\]]+)]\(([^)\s]+)(?:\s+"([^"]+)")?\))`$/;

export function parseMarkdownLinkCode(text: string): JSONContent[] | null {
  const match = parseMarkdownLink(text);

  if (!match) {
    return null;
  }

  const attrs = match.title
    ? { href: match.href, title: match.title }
    : { href: match.href };

  return [
    {
      type: 'text',
      text: match.label,
      marks: [
        {
          type: 'link',
          attrs,
        },
      ],
    },
  ];
}

export function getMarkdownLinkCodeInputMatch(text: string) {
  const match = text.match(MARKDOWN_LINK_CODE_INPUT_REGEX);

  if (!match) {
    return null;
  }

  const [matchedText, markdownText, label, href, title] = match;

  return {
    href,
    index: match.index ?? 0,
    label,
    markdownText,
    matchedText,
    title,
  };
}

export const EditorCode = Code.extend({
  parseMarkdown: (token, helpers) => {
    const text = token.text || '';
    const markdownLink = parseMarkdownLinkCode(text);

    if (markdownLink) {
      return markdownLink;
    }

    return helpers.applyMark('code', [{ type: 'text', text }]);
  },

  addInputRules() {
    return [
      new InputRule({
        find: text => {
          const match = getMarkdownLinkCodeInputMatch(text);

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
          const linkMatch = match.data as ReturnType<
            typeof getMarkdownLinkCodeInputMatch
          >;

          if (!linkMatch) {
            return null;
          }

          const attrs = linkMatch.title
            ? { href: linkMatch.href, title: linkMatch.title }
            : { href: linkMatch.href };
          const { tr } = state;

          tr.replaceWith(
            range.from,
            range.to,
            state.schema.text(linkMatch.label, [
              state.schema.marks.link.create(attrs),
            ])
          );
        },
      }),
      ...(this.parent?.() ?? []),
    ];
  },
});
