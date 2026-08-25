/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import CopilotPanel from './CopilotPanel';
import { getCopilotWorkspace, useCopilotStore } from './copilotStore';

let copilotViewMounts = 0;
let resizeCallback: ResizeObserverCallback;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/page/chat/header/Actions', () => ({
  __esModule: true,
  default: () => <button type="button">actions</button>,
}));

jest.mock('@/page/chat/conversations/ConversationSearchDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/page/chat/header/title', () => ({
  __esModule: true,
  default: ({ data }: { data: string }) => (
    <span data-testid="copilot-title">{data}</span>
  ),
}));

jest.mock('@/page/chat/header/useChatTitle', () => ({
  useChatTitle: () => ({ chatTitle: 'Panel title', i18nTitle: 'New' }),
}));

jest.mock('@/components/ui/Breadcrumb', () => ({
  Breadcrumb: ({ children }: { children: React.ReactNode }) => (
    <nav>{children}</nav>
  ),
  BreadcrumbList: ({ children }: { children: React.ReactNode }) => (
    <ol>{children}</ol>
  ),
  BreadcrumbItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
}));

jest.mock('./CopilotToggleButton', () => ({
  __esModule: true,
  default: () => <button type="button">toggle</button>,
}));

jest.mock('./CopilotView', () => ({
  __esModule: true,
  default: () => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      copilotViewMounts += 1;
    }, []);
    return <div data-testid="copilot-view" />;
  },
}));

class ResizeObserverMock implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }

  disconnect() {}
  observe() {}
  unobserve() {}
}

function resizeWorkspace(width: number) {
  resizeCallback(
    [
      {
        contentRect: { width },
      } as ResizeObserverEntry,
    ],
    {} as ResizeObserver
  );
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });
  window.dispatchEvent(new Event('resize'));
}

describe('CopilotPanel', () => {
  let container: HTMLDivElement;
  let root: Root;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = false;
  });

  beforeEach(() => {
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = ResizeObserverMock;
    sessionStorage.clear();
    useCopilotStore.setState({ workspaces: {} });
    copilotViewMounts = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    document.body.style.overflow = '';
    global.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
  });

  it('keeps one conversation subtree mounted while closing and changing layouts', async () => {
    act(() => {
      setViewportWidth(900);
      useCopilotStore.getState().showConversation('namespace-a', 'chat-a');
    });
    await act(async () =>
      root.render(<CopilotPanel namespaceId="namespace-a" />)
    );

    const panel = container.querySelector('aside');
    expect(copilotViewMounts).toBe(1);
    expect(panel?.dataset.layout).toBe('overlay');
    expect(
      container.querySelector('[data-testid="copilot-title"]')?.textContent
    ).toBe('Panel title');

    act(() => {
      setViewportWidth(1200);
      resizeWorkspace(1200);
    });
    expect(panel?.dataset.layout).toBe('split');
    expect(copilotViewMounts).toBe(1);

    act(() => useCopilotStore.getState().close('namespace-a'));
    expect(
      container.querySelector('[data-testid="copilot-view"]')
    ).not.toBeNull();
    expect(panel?.hasAttribute('inert')).toBe(true);
    expect(panel?.getAttribute('aria-hidden')).toBe('true');
    expect(copilotViewMounts).toBe(1);

    act(() => useCopilotStore.getState().open('namespace-a'));
    expect(copilotViewMounts).toBe(1);
  });

  it('closes an overlay with Escape and restores scrolling and focus', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    document.body.style.overflow = 'clip';
    trigger.focus();
    act(() => {
      setViewportWidth(900);
      useCopilotStore.getState().open('namespace-a');
    });

    await act(async () =>
      root.render(<CopilotPanel namespaceId="namespace-a" />)
    );
    act(() => resizeWorkspace(900));

    expect(document.body.style.overflow).toBe('hidden');
    const panel = container.querySelector('aside');
    const controls = panel?.querySelectorAll<HTMLButtonElement>('button');
    const firstControl = controls?.[0];
    const lastControl = controls?.[controls.length - 1];
    lastControl?.focus();
    act(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    );
    expect(document.activeElement).toBe(firstControl);

    act(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    );

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a').open
    ).toBe(false);
    expect(document.body.style.overflow).toBe('clip');
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
