import type { Editor } from '@tiptap/react';

import type { SlashCommandItem } from './slashCommandItems';

export interface SlashCommandSelectProps {
  item: SlashCommandItem;
}

export interface SlashCommandOptions {
  getItems: (query: string, editor: Editor) => SlashCommandItem[];
  onSelect?: (props: SlashCommandSelectProps) => boolean | void;
}
