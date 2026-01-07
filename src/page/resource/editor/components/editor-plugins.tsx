import { AutoformatPlugin } from '@platejs/autoformat';
import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  HeadingPlugin,
  HorizontalRulePlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from '@platejs/basic-nodes/react';
import { CodeBlockPlugin } from '@platejs/code-block/react';
import { LinkPlugin } from '@platejs/link/react';
import { ListPlugin } from '@platejs/list/react';
import { MarkdownPlugin } from '@platejs/markdown';
import type { PlatePlugin } from 'platejs/react';
import { ParagraphPlugin } from 'platejs/react';

import { HrElement } from '@/components/ui/hr-element';

import { FontFamilyPlugin } from '../plugins/font-family-plugin';
import { FontFamilyLeaf } from './font-family-leaf';

export const editorPlugins: PlatePlugin[] = [
  // Basic marks
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,

  // Font family plugin
  FontFamilyPlugin.configure({
    render: { leaf: FontFamilyLeaf },
  }),

  // Basic elements
  ParagraphPlugin,
  HeadingPlugin,
  BlockquotePlugin,

  // Horizontal rule with custom component
  HorizontalRulePlugin.configure({
    render: { node: HrElement },
  }),

  // List - using indent list mode
  ListPlugin.configure({
    options: {
      enableResetOnShiftTab: true,
    },
  }),

  // Code block
  CodeBlockPlugin,

  // Link
  LinkPlugin,

  // Markdown serialization
  MarkdownPlugin.configure({
    options: {
      indentList: true,
    },
  }),

  // Autoformat for markdown shortcuts
  AutoformatPlugin,
];
