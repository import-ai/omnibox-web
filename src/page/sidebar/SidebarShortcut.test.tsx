/** @jest-environment jsdom */

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});

jest.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { SidebarProvider, useSidebar } from '@/components/ui/Sidebar';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function SidebarProbe() {
  const { open } = useSidebar();
  return <div data-testid="sidebar-state">{open ? 'open' : 'closed'}</div>;
}

async function pressShortcut(target: HTMLElement, init: KeyboardEventInit) {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        ...init,
      })
    );
  });
}

describe('sidebar keyboard shortcut', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root.render(
        <SidebarProvider>
          <SidebarProbe />
        </SidebarProvider>
      )
    );
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    document.body.replaceChildren();
  });

  function state() {
    return container.querySelector('[data-testid="sidebar-state"]')
      ?.textContent;
  }

  function mountEditorPage() {
    const page = document.createElement('div');
    page.className = 'resource-editable-page';
    const title = document.createElement('textarea');
    const editor = document.createElement('div');
    editor.className = 'ProseMirror';
    editor.setAttribute('contenteditable', 'true');
    page.append(title, editor);
    document.body.appendChild(page);
    return { title, editor };
  }

  it('keeps the sidebar still when Command+B is used in the document body', async () => {
    const { editor } = mountEditorPage();

    await pressShortcut(editor, { key: 'b', metaKey: true });

    expect(state()).toBe('open');
  });

  it('keeps the sidebar still when Command+B is used in the title', async () => {
    const { title } = mountEditorPage();

    await pressShortcut(title, { key: 'b', metaKey: true });

    expect(state()).toBe('open');
  });

  it('keeps the sidebar still when Ctrl+B is used anywhere on the edit page', async () => {
    mountEditorPage();
    const search = document.createElement('input');
    document.body.appendChild(search);

    await pressShortcut(search, { key: 'b', ctrlKey: true });

    expect(state()).toBe('open');
  });

  it('toggles the sidebar for Command+B outside edit mode', async () => {
    const search = document.createElement('input');
    document.body.appendChild(search);

    await pressShortcut(search, { key: 'b', metaKey: true });

    expect(state()).toBe('closed');
  });

  it('still toggles the sidebar for Command+B in a read-only document', async () => {
    const editor = document.createElement('div');
    editor.className = 'ProseMirror';
    editor.setAttribute('contenteditable', 'false');
    document.body.appendChild(editor);

    await pressShortcut(editor, { key: 'b', metaKey: true });

    expect(state()).toBe('closed');
  });
});
