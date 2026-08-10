/** @jest-environment jsdom */

import { act, Suspense } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useCopilotStore } from './copilotStore';
import CopilotView from './CopilotView';

jest.mock('react-router-dom', () => {
  const util = jest.requireActual<typeof import('node:util')>('node:util');
  Object.assign(globalThis, {
    TextDecoder: util.TextDecoder,
    TextEncoder: util.TextEncoder,
  });
  return jest.requireActual('react-router-dom');
});

jest.mock('@/page/chat/conversations', () => ({
  __esModule: true,
  default: ({ namespaceId }: { namespaceId?: string }) => (
    <div>history:{namespaceId}</div>
  ),
}));

jest.mock('@/page/chat/conversation', () => ({
  __esModule: true,
  default: () => <div>conversation</div>,
}));

jest.mock('./CopilotHome', () => ({
  __esModule: true,
  default: () => <div>home</div>,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CopilotView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    useCopilotStore.setState({ workspaces: {} });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  it('renders history inside the namespace resource route', async () => {
    useCopilotStore.getState().showHistory('namespace-a');

    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={['/namespace-a']}>
          <Routes>
            <Route
              path="/:namespace_id"
              element={
                <Suspense fallback={null}>
                  <CopilotView namespaceId="namespace-a" />
                </Suspense>
              }
            />
          </Routes>
        </MemoryRouter>
      )
    );

    expect(container.textContent).toContain('history:namespace-a');
  });

  it('renders a selected conversation inside the namespace resource route', async () => {
    useCopilotStore
      .getState()
      .showConversation('namespace-a', 'conversation-a');

    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={['/namespace-a']}>
          <Routes>
            <Route
              path="/:namespace_id"
              element={
                <Suspense fallback={null}>
                  <CopilotView namespaceId="namespace-a" />
                </Suspense>
              }
            />
          </Routes>
        </MemoryRouter>
      )
    );

    expect(container.textContent).toContain('conversation');
  });
});
