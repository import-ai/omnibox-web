import type {} from '@tiptap/extension-list';
import type {} from '@tiptap/extension-table';
import type { Editor } from '@tiptap/react';
import type {} from '@tiptap/starter-kit';
import type { LucideIcon } from 'lucide-react';
import {
  CheckSquare,
  CodeXml,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Sigma,
  Smile,
  Table,
  Workflow,
} from 'lucide-react';

import {
  createBlockMathSnippet,
  createEchartsSnippet,
  createInlineMathSnippet,
  createMermaidSnippet,
  insertMarkdownSnippet,
} from '../insert-menu/insertSnippets';
import { canInsertTable, insertTable } from '../table/tableActions';

export type SlashCommandKey =
  | 'blockMath'
  | 'blockquote'
  | 'bulletList'
  | 'codeBlock'
  | 'echarts'
  | 'emoji'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'horizontalRule'
  | 'image'
  | 'inlineMath'
  | 'mermaid'
  | 'orderedList'
  | 'paragraph'
  | 'table'
  | 'taskList';

export type SlashCommandLabels = Record<SlashCommandKey, string>;

export interface SlashCommandContext {
  insideTable?: boolean;
}

export interface SlashCommandItem {
  aliases: string[];
  icon: LucideIcon;
  key: SlashCommandKey;
  label: string;
  run: (editor: Editor) => boolean | void;
}

function createHeadingCommand(level: 1 | 2 | 3 | 4 | 5 | 6) {
  return (editor: Editor) => editor.chain().focus().setHeading({ level }).run();
}

export function getSlashCommandItems(
  labels: SlashCommandLabels,
  context: SlashCommandContext = {}
): SlashCommandItem[] {
  const items: SlashCommandItem[] = [
    {
      aliases: ['text', 'paragraph', 'p'],
      icon: Pilcrow,
      key: 'paragraph',
      label: labels.paragraph,
      run: editor => editor.chain().focus().setParagraph().run(),
    },
    {
      aliases: ['1', 'h1', 'heading', 'title'],
      icon: Heading1,
      key: 'heading1',
      label: labels.heading1,
      run: createHeadingCommand(1),
    },
    {
      aliases: ['2', 'h2', 'heading', 'subtitle'],
      icon: Heading2,
      key: 'heading2',
      label: labels.heading2,
      run: createHeadingCommand(2),
    },
    {
      aliases: ['3', 'h3', 'heading'],
      icon: Heading3,
      key: 'heading3',
      label: labels.heading3,
      run: createHeadingCommand(3),
    },
    {
      aliases: ['4', 'h4', 'heading'],
      icon: Heading4,
      key: 'heading4',
      label: labels.heading4,
      run: createHeadingCommand(4),
    },
    {
      aliases: ['5', 'h5', 'heading'],
      icon: Heading5,
      key: 'heading5',
      label: labels.heading5,
      run: createHeadingCommand(5),
    },
    {
      aliases: ['6', 'h6', 'heading'],
      icon: Heading6,
      key: 'heading6',
      label: labels.heading6,
      run: createHeadingCommand(6),
    },
    {
      aliases: ['bullet', 'ul', 'list'],
      icon: List,
      key: 'bulletList',
      label: labels.bulletList,
      run: editor => editor.chain().focus().toggleBulletList().run(),
    },
    {
      aliases: ['ordered', 'ol', 'number', 'list'],
      icon: ListOrdered,
      key: 'orderedList',
      label: labels.orderedList,
      run: editor => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      aliases: ['todo', 'task', 'check'],
      icon: CheckSquare,
      key: 'taskList',
      label: labels.taskList,
      run: editor => editor.chain().focus().toggleTaskList().run(),
    },
    {
      aliases: ['quote', 'blockquote'],
      icon: Quote,
      key: 'blockquote',
      label: labels.blockquote,
      run: editor => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      aliases: ['hr', 'divider', 'line'],
      icon: Minus,
      key: 'horizontalRule',
      label: labels.horizontalRule,
      run: editor => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      aliases: ['code', 'codeblock'],
      icon: CodeXml,
      key: 'codeBlock',
      label: labels.codeBlock,
      run: editor => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      aliases: ['image', 'img', 'upload'],
      icon: Image,
      key: 'image',
      label: labels.image,
      run: () => undefined,
    },
    {
      aliases: ['emoji', 'smile'],
      icon: Smile,
      key: 'emoji',
      label: labels.emoji,
      run: editor => editor.chain().focus().insertContent('😀').run(),
    },
    {
      aliases: ['math', 'formula', 'inline'],
      icon: Sigma,
      key: 'inlineMath',
      label: labels.inlineMath,
      run: editor => insertMarkdownSnippet(editor, createInlineMathSnippet()),
    },
    {
      aliases: ['math', 'formula', 'block'],
      icon: Sigma,
      key: 'blockMath',
      label: labels.blockMath,
      run: editor => insertMarkdownSnippet(editor, createBlockMathSnippet()),
    },
    {
      aliases: ['mermaid', 'diagram', 'flowchart'],
      icon: Workflow,
      key: 'mermaid',
      label: labels.mermaid,
      run: editor => insertMarkdownSnippet(editor, createMermaidSnippet()),
    },
    {
      aliases: ['echarts', 'chart', 'diagram'],
      icon: Workflow,
      key: 'echarts',
      label: labels.echarts,
      run: editor => insertMarkdownSnippet(editor, createEchartsSnippet()),
    },
  ];

  if (!context.insideTable) {
    items.splice(10, 0, {
      aliases: ['table', 'grid'],
      icon: Table,
      key: 'table',
      label: labels.table,
      run: editor => {
        if (
          !canInsertTable(editor, {
            cols: 3,
            rows: 3,
          })
        ) {
          return false;
        }

        return insertTable(editor, {
          cols: 3,
          rows: 3,
        });
      },
    });
  }

  return items;
}

export function filterSlashCommandItems(
  items: SlashCommandItem[],
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter(item => {
    const haystack = [item.key, item.label, ...item.aliases]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
