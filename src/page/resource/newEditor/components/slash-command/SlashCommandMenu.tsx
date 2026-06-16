import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

import type { SlashCommandItem } from './slashCommandItems';

export interface SlashCommandMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashCommandMenuProps {
  command: (item: SlashCommandItem) => void;
  items: SlashCommandItem[];
}

const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>(
  (props, ref) => {
    const { command, items } = props;
    const [selectedIndex, setSelectedIndex] = useState(0);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useEffect(() => {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
      onKeyDown(event) {
        if (!items.length) {
          return false;
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex(index => (index + 1) % items.length);
          return true;
        }

        if (event.key === 'ArrowUp') {
          setSelectedIndex(index => (index + items.length - 1) % items.length);
          return true;
        }

        if (event.key === 'Enter') {
          command(items[selectedIndex]);
          return true;
        }

        return false;
      },
    }));

    if (!items.length) {
      return null;
    }

    return (
      <div className="max-h-[var(--omnibox-slash-command-max-height,20rem)] w-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        {items.map((item, index) => {
          const Icon = item.icon;
          const selected = index === selectedIndex;

          return (
            <button
              key={item.key}
              ref={element => {
                itemRefs.current[index] = element;
              }}
              type="button"
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => command(item)}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-700',
                'hover:bg-slate-100 hover:text-slate-950',
                'dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white',
                selected &&
                  'bg-slate-100 text-slate-950 dark:bg-neutral-800 dark:text-white'
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-500 dark:border-neutral-700 dark:text-neutral-300">
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }
);

SlashCommandMenu.displayName = 'SlashCommandMenu';

export default SlashCommandMenu;
