/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { ResourceSortOptions } from '@/service/resource';

import { ResourceSortMenu } from './ResourceSortMenu';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

interface MenuPartProps {
  'aria-current'?: 'true';
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

function createMenuPart(kind: 'context' | 'dropdown', part: string) {
  return function MenuPart({
    children,
    disabled,
    onSelect,
    ...props
  }: MenuPartProps) {
    if (part === 'item' || part === 'sub-trigger') {
      return (
        <button
          type="button"
          data-menu-kind={kind}
          data-menu-part={part}
          disabled={disabled}
          onClick={onSelect}
          {...props}
        >
          {children}
        </button>
      );
    }

    return (
      <div data-menu-kind={kind} data-menu-part={part} {...props}>
        {children}
      </div>
    );
  };
}

jest.mock('@/components/ui/ContextMenu', () => ({
  ContextMenuItem: createMenuPart('context', 'item'),
  ContextMenuSub: createMenuPart('context', 'sub'),
  ContextMenuSubContent: createMenuPart('context', 'sub-content'),
  ContextMenuSubTrigger: createMenuPart('context', 'sub-trigger'),
}));

jest.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenuItem: createMenuPart('dropdown', 'item'),
  DropdownMenuSub: createMenuPart('dropdown', 'sub'),
  DropdownMenuSubContent: createMenuPart('dropdown', 'sub-content'),
  DropdownMenuSubTrigger: createMenuPart('dropdown', 'sub-trigger'),
}));

const currentSort: ResourceSortOptions = {
  sort_by: 'updated_at',
  sort_order: 'desc',
};

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ResourceSortMenu', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderSortMenu(
    variant: 'context' | 'dropdown' | undefined,
    onChange = jest.fn(),
    disabled = false
  ) {
    await act(async () =>
      root.render(
        <ResourceSortMenu
          variant={variant}
          value={currentSort}
          disabled={disabled}
          onChange={onChange}
        />
      )
    );

    return onChange;
  }

  it('uses dropdown menu primitives by default', async () => {
    await renderSortMenu(undefined);

    expect(container.innerHTML).toContain('data-menu-kind="dropdown"');
    expect(container.innerHTML).not.toContain('data-menu-kind="context"');
    expect(container.textContent).toContain('sidebar.sort.menu');
    expect(container.textContent).toContain('sidebar.sort.manual');
  });

  it('uses context menu primitives and keeps sort behavior', async () => {
    const onChange = await renderSortMenu('context');
    const items = container.querySelectorAll<HTMLButtonElement>(
      '[data-menu-part="item"]'
    );

    expect(container.innerHTML).toContain('data-menu-kind="context"');
    expect(container.innerHTML).not.toContain('data-menu-kind="dropdown"');
    expect(items).toHaveLength(7);
    expect(items[1].getAttribute('aria-current')).toBe('true');

    await act(async () => items[0].click());

    expect(onChange).toHaveBeenCalledWith({
      sort_by: 'updated_at',
      sort_order: 'asc',
    });
  });

  it('disables context menu sorting while an update is pending', async () => {
    await renderSortMenu('context', jest.fn(), true);
    const buttons = container.querySelectorAll<HTMLButtonElement>('button');

    expect(buttons).toHaveLength(8);
    expect(Array.from(buttons).every(button => button.disabled)).toBe(true);
  });
});
