import { Extension, ReactRenderer } from '@tiptap/react';
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from '@tiptap/suggestion';

import type { SlashCommandItem } from './slashCommandItems';
import SlashCommandMenu, { type SlashCommandMenuRef } from './SlashCommandMenu';
import { getSlashCommandMenuPosition } from './slashCommandPosition';
import type { SlashCommandOptions } from './types';

function getSlashCommandContainer() {
  const existing = document.querySelector<HTMLElement>(
    '[data-omnibox-slash-command]'
  );

  if (existing) {
    return existing;
  }

  const container = document.createElement('div');

  container.dataset.omniboxSlashCommand = 'true';
  container.className = 'omnibox-slash-command fixed z-50';
  document.body.appendChild(container);

  return container;
}

function setMenuPosition(
  element: HTMLElement,
  clientRect?: (() => DOMRect | null) | null
) {
  const rect = clientRect?.();

  if (!rect) {
    element.style.display = 'none';
    return;
  }

  const position = getSlashCommandMenuPosition(
    rect,
    {
      height: element.offsetHeight,
      width: element.offsetWidth,
    },
    {
      height: window.innerHeight,
      width: window.innerWidth,
    }
  );

  element.style.display = '';
  element.style.left = `${position.left}px`;
  element.style.top = `${position.top}px`;
  element.style.setProperty(
    '--omnibox-slash-command-max-height',
    `${position.maxHeight}px`
  );
}

type SlashSuggestionProps = SuggestionProps<SlashCommandItem, SlashCommandItem>;

function createRender() {
  let renderer: ReactRenderer<
    SlashCommandMenuRef,
    {
      command: (item: SlashCommandItem) => void;
      items: SlashCommandItem[];
    }
  > | null = null;
  let container: HTMLElement | null = null;

  const update = (props: SlashSuggestionProps) => {
    renderer?.updateProps({
      command: (item: SlashCommandItem) => props.command(item),
      items: props.items,
    });

    const element = container ?? renderer?.element;

    if (element) {
      setMenuPosition(element, props.clientRect);
    }
  };

  return {
    onStart: (props: SlashSuggestionProps) => {
      container = getSlashCommandContainer();
      renderer = new ReactRenderer(SlashCommandMenu, {
        editor: props.editor,
        props: {
          command: (item: SlashCommandItem) => props.command(item),
          items: props.items,
        },
      });
      container.replaceChildren(renderer.element);
      setMenuPosition(container, props.clientRect);
    },
    onUpdate: update,
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === 'Escape') {
        return false;
      }

      return renderer?.ref?.onKeyDown(props.event) ?? false;
    },
    onExit: () => {
      renderer?.destroy();
      renderer = null;
      container?.remove();
      container = null;
    },
  };
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      getItems: () => [],
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        allow: ({ editor, range }) => {
          const $from = editor.state.doc.resolve(range.from);

          return $from.parent.type.name === 'paragraph';
        },
        allowedPrefixes: null,
        char: '/',
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();

          const handled = this.options.onSelect?.({
            item: props,
          });

          if (handled) {
            return;
          }

          props.run(editor);
        },
        editor: this.editor,
        items: ({ editor, query }) => this.options.getItems(query, editor),
        render: createRender,
        startOfLine: false,
      }),
    ];
  },
});
