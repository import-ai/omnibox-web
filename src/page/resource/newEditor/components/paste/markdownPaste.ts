import type {} from '@tiptap/markdown';
import { Plugin } from '@tiptap/pm/state';
import type { Editor, JSONContent } from '@tiptap/react';
import { Extension } from '@tiptap/react';

export const markdownPastePatterns = [
  /^#{1,6}\s/m,
  /^>\s/m,
  /^[-+*]\s/m,
  /^\d+\.\s/m,
  /^[-+*]\s+\[[ xX]\]\s/m,
  /^```[\s\S]*```/m,
  /^\$\$[\s\S]*\$\$/m,
  /^\|.+\|\s*\n\|[-:\s|]+\|/m,
  /!\[[^\]]*]\([^)]+\)/,
  /\[[^\]]+]\([^)]+\)/,
  /\*\*[^*\n]+?\*\*/,
  /~~[^~\n]+?~~/,
  /`[^`\n]+?`/,
  /\$[^$\n]+?\$/,
  /<\/?[a-z][\s\S]*>/i,
];

export function looksLikeMarkdown(text: string) {
  if (!text.trim()) {
    return false;
  }

  return markdownPastePatterns.some(pattern => pattern.test(text));
}

export function createPlainTextContent(text: string): JSONContent {
  const normalizedText = text.replace(/\r\n?/g, '\n');
  const paragraphs = normalizedText.split(/\n{2,}/);
  const content = paragraphs.map(paragraph => {
    const paragraphContent = paragraph.split('\n').flatMap((line, index) => {
      const nodes: JSONContent[] = [];

      if (index > 0) {
        nodes.push({ type: 'hardBreak' });
      }

      if (line) {
        nodes.push({ type: 'text', text: line });
      }

      return nodes;
    });

    return paragraphContent.length
      ? {
          type: 'paragraph',
          content: paragraphContent,
        }
      : { type: 'paragraph' };
  });

  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph' }],
  };
}

export function parsePastedMarkdown(editor: Editor, text: string) {
  try {
    return editor.markdown?.parse(text) ?? createPlainTextContent(text);
  } catch {
    return createPlainTextContent(text);
  }
}

export function insertPastedMarkdown(editor: Editor, text: string) {
  const parsedContent = parsePastedMarkdown(editor, text);

  try {
    if (editor.commands.insertContent(parsedContent)) {
      return true;
    }
  } catch {
    // Fall through to the plain-text insertion below.
  }

  return editor.commands.insertContent(createPlainTextContent(text));
}

export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const text = event.clipboardData?.getData('text/plain');

            if (!text || !looksLikeMarkdown(text)) {
              return false;
            }

            return insertPastedMarkdown(editor, text);
          },
        },
      }),
    ];
  },
});
