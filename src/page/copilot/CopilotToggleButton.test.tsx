/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';
import CopilotToggleButton from './CopilotToggleButton';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/assets/icons/ChatIcon', () => ({
  ChatIcon: () => null,
}));

jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@/page/resource/comments/ResourceCommentsContext', () => ({
  useResourceCommentsPanel: () => null,
}));

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

describe('CopilotToggleButton', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useCopilotStore.setState({ workspaces: {}, pendingExpandFromResource: {} });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens Copilot home instead of restoring resource history', async () => {
    useCopilotStore.getState().showResourceHistory('namespace-a', 'resource-a');

    await act(async () =>
      root.render(<CopilotToggleButton namespaceId="namespace-a" />)
    );
    act(() => container.querySelector('button')?.click());

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toEqual(expect.objectContaining({ open: true, view: 'home' }));
  });

  it('collapses the right sidebar while Copilot is active', async () => {
    useCopilotStore.getState().showHome('namespace-a');

    await act(async () =>
      root.render(<CopilotToggleButton namespaceId="namespace-a" />)
    );
    act(() => container.querySelector('button')?.click());

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a').open
    ).toBe(false);
  });
});
