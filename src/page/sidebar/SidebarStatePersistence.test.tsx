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

import { writeSidebarSessionState } from './sidebarSessionState';
import SidebarStatePersistence from './SidebarStatePersistence';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function SidebarProbe() {
  const { open, setOpen, setWidth, width } = useSidebar();
  return (
    <button
      onClick={() => {
        setOpen(true);
        setWidth(300);
      }}
    >
      {open ? 'open' : 'closed'}:{width}
    </button>
  );
}

describe('SidebarStatePersistence', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('hydrates and persists the SidebarProvider layout state', async () => {
    writeSidebarSessionState({ open: false, width: 320 });

    await act(async () =>
      root.render(
        <SidebarProvider>
          <SidebarStatePersistence />
          <SidebarProbe />
        </SidebarProvider>
      )
    );

    const button = container.querySelector('button');
    expect(button?.textContent).toBe('closed:320');

    await act(async () => button?.click());
    expect(sessionStorage.getItem('workspace-sidebar-state')).toBe(
      JSON.stringify({ open: true, width: 300 })
    );
  });
});
