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

  it('keeps the sidebar still when Command+B is used in an editable editor', async () => {
    const editor = document.createElement('div');
    editor.className = 'ProseMirror';
    editor.setAttribute('contenteditable', 'true');
    const text = document.createElement('p');
    editor.appendChild(text);
    document.body.appendChild(editor);

    await pressShortcut(text, { key: 'b', metaKey: true });

    expect(state()).toBe('open');
  });

  it('keeps the sidebar still when Ctrl+B is used in an editable editor', async () => {
    const editor = document.createElement('div');
    editor.className = 'tiptap ProseMirror';
    editor.setAttribute('contenteditable', 'true');
    document.body.appendChild(editor);

    await pressShortcut(editor, { key: 'b', ctrlKey: true });

    expect(state()).toBe('open');
  });

  it('toggles the sidebar for Command+B outside the editor', async () => {
    const search = document.createElement('input');
    document.body.appendChild(search);

    await pressShortcut(search, { key: 'b', metaKey: true });

    expect(state()).toBe('closed');
  });

  it('still toggles the sidebar for Command+B in a read-only editor', async () => {
    const editor = document.createElement('div');
    editor.className = 'ProseMirror';
    editor.setAttribute('contenteditable', 'false');
    document.body.appendChild(editor);

    await pressShortcut(editor, { key: 'b', metaKey: true });

    expect(state()).toBe('closed');
  });
});
