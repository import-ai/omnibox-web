/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';
import Workspace from './Workspace';

const mockUseLocation = jest.fn();
let mockIsMobile = false;

jest.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="route-outlet" />,
  useLocation: () => mockUseLocation(),
  useParams: () => ({ namespace_id: 'namespace-a' }),
}));

jest.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

jest.mock('./CitationResourcePreview', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./CopilotPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="copilot-panel" />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Copilot Workspace', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockIsMobile = false;
    useCopilotStore.setState({ workspaces: {} });
    mockUseLocation.mockReturnValue({
      key: 'chat',
      pathname: '/namespace-a/chat/conversation-a',
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  it('resets Copilot when navigating from a citation preview to a resource', async () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-a');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');

    await act(async () => root.render(<Workspace />));
    mockUseLocation.mockReturnValue({
      key: 'resource',
      pathname: '/namespace-a/Zyxw9876Vuts5432',
    });
    await act(async () => root.render(<Workspace />));

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      conversationId: null,
      open: false,
      previewResourceId: null,
      view: 'home',
    });

    act(() => useCopilotStore.getState().toggle('namespace-a'));

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({ conversationId: null, open: true, view: 'home' });
  });

  it('keeps a manually opened Copilot visible on a resource route', async () => {
    useCopilotStore.getState().open('namespace-a');
    mockUseLocation.mockReturnValue({
      key: 'resource',
      pathname: '/namespace-a/Zyxw9876Vuts5432',
    });

    await act(async () => root.render(<Workspace />));

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({ open: true, previewResourceId: null });
  });

  it('keeps a citation preview opened from Copilot on the current resource route', async () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-a');
    mockUseLocation.mockReturnValue({
      key: 'resource-a',
      pathname: '/namespace-a/Zyxw9876Vuts5432',
    });

    await act(async () => root.render(<Workspace />));
    act(() => store.previewResource('namespace-a', 'Abcd1234Efgh5678'));

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      conversationId: 'conversation-a',
      open: true,
      previewResourceId: 'Abcd1234Efgh5678',
      view: 'conversation',
    });
  });

  it('uses the existing chat route as the only conversation surface beside a citation preview', async () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-a');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');

    await act(async () => root.render(<Workspace />));

    expect(
      container.querySelector('[data-testid="route-outlet"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-testid="copilot-panel"]')).toBeNull();
  });

  it('uses the existing chat route as the mobile Copilot surface', async () => {
    mockIsMobile = true;
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-a');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');

    await act(async () => root.render(<Workspace />));

    const routeOutlet = container.querySelector('[data-testid="route-outlet"]');
    expect(routeOutlet?.parentElement?.classList.contains('fixed')).toBe(true);
    expect(routeOutlet?.parentElement?.classList.contains('inset-0')).toBe(
      true
    );
    expect(routeOutlet?.parentElement?.classList.contains('w-full')).toBe(true);
    expect(container.querySelector('[data-testid="copilot-panel"]')).toBeNull();
  });

  it('keeps the citation preview after collapsing Copilot on a chat route', async () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-a');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');

    await act(async () => root.render(<Workspace />));
    act(() => store.toggle('namespace-a'));

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      conversationId: 'conversation-a',
      open: false,
      previewResourceId: 'Abcd1234Efgh5678',
      view: 'conversation',
    });
    expect(
      container
        .querySelector('[data-testid="route-outlet"]')
        ?.parentElement?.hasAttribute('inert')
    ).toBe(true);
    expect(container.querySelector('[data-testid="copilot-panel"]')).toBeNull();
  });

  it('resets Copilot when navigating between resources with a preview open', async () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-a');
    mockUseLocation.mockReturnValue({
      key: 'resource-a',
      pathname: '/namespace-a/Zyxw9876Vuts5432',
    });

    await act(async () => root.render(<Workspace />));
    act(() => store.previewResource('namespace-a', 'Abcd1234Efgh5678'));
    mockUseLocation.mockReturnValue({
      key: 'resource-b',
      pathname: '/namespace-a/Qwer1234Tyui5678',
    });
    await act(async () => root.render(<Workspace />));

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      conversationId: null,
      open: false,
      previewResourceId: null,
      view: 'home',
    });
  });

  it('keeps Copilot open when editing the previewed resource', async () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-a');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');

    await act(async () => root.render(<Workspace />));
    mockUseLocation.mockReturnValue({
      key: 'edit',
      pathname: '/namespace-a/Abcd1234Efgh5678/edit',
    });
    await act(async () => root.render(<Workspace />));

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      conversationId: 'conversation-a',
      open: true,
      previewResourceId: null,
      view: 'conversation',
    });
  });

  it('resets Copilot when opening the full chat history page', async () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-a');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');

    await act(async () => root.render(<Workspace />));
    mockUseLocation.mockReturnValue({
      key: 'history',
      pathname: '/namespace-a/chat/conversations',
    });
    await act(async () => root.render(<Workspace />));

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      conversationId: null,
      open: false,
      previewResourceId: null,
      view: 'home',
    });
  });
});
