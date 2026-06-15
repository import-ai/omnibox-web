import { ChevronRight } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';

import { cn } from '@/lib/utils';

import type { MenuPosition, TableMenuAction, TableMenuGroup } from './types';

interface TableContextMenuContentProps {
  deleteTableAction: TableMenuAction;
  groups: TableMenuGroup[];
  menuRef: RefObject<HTMLDivElement | null>;
  position: MenuPosition;
}

interface TableMenuItemProps {
  action: TableMenuAction;
}

interface TableMenuSubProps {
  children: ReactNode;
  label: string;
}

function TableMenuSub(props: TableMenuSubProps) {
  const { children, label } = props;

  return (
    <div className="group relative">
      <button
        type="button"
        onMouseDown={event => event.preventDefault()}
        className={cn(
          'flex w-full items-center rounded-sm px-1.5 py-1 text-left text-xs outline-none transition-colors',
          'hover:bg-slate-100 focus-visible:bg-slate-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800'
        )}
      >
        <span className="min-w-0 flex-1">{label}</span>
        <ChevronRight className="ml-1.5 size-3 text-slate-400 dark:text-neutral-500" />
      </button>
      <div
        className={cn(
          'invisible absolute left-full top-0 z-50 ml-1 w-36 rounded-md border border-slate-200 bg-white p-1 opacity-0 shadow-lg transition',
          'group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100',
          'dark:border-neutral-700 dark:bg-neutral-900'
        )}
      >
        {children}
      </div>
    </div>
  );
}

function TableMenuSeparator() {
  return <div className="-mx-1 my-0.5 h-px bg-slate-200 dark:bg-neutral-700" />;
}

function TableMenuItem(props: TableMenuItemProps) {
  const { action } = props;

  return (
    <button
      type="button"
      disabled={action.disabled}
      onMouseDown={event => event.preventDefault()}
      onClick={action.onSelect}
      className={cn(
        'flex w-full items-center rounded-sm px-1.5 py-1 text-left text-xs outline-none transition-colors',
        'hover:bg-slate-100 focus-visible:bg-slate-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800',
        action.disabled &&
          'cursor-not-allowed text-slate-300 hover:bg-transparent dark:text-neutral-600 dark:hover:bg-transparent'
      )}
    >
      {action.label}
    </button>
  );
}

function TableContextMenuContent(props: TableContextMenuContentProps) {
  const { deleteTableAction, groups, menuRef, position } = props;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-32 rounded-md border border-slate-200 bg-white p-1 text-slate-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
      style={{ left: position.x, top: position.y }}
    >
      {groups.map(group => (
        <TableMenuSub key={group.key} label={group.label}>
          {group.actions.map(action => (
            <TableMenuItem key={action.key} action={action} />
          ))}
        </TableMenuSub>
      ))}

      <TableMenuSeparator />
      <TableMenuItem action={deleteTableAction} />
    </div>
  );
}

export default TableContextMenuContent;
