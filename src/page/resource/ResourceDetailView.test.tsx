/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Resource } from '@/interface';

import ResourceDetailView from './ResourceDetailView';

jest.mock('@/components/ui/Separator', () => ({
  Separator: () => <div data-testid="separator" />,
}));
jest.mock('@/components/ui/Sidebar', () => ({
  SidebarInset: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <main {...props}>{children}</main>
  ),
  useSidebar: () => ({ open: true, width: 240 }),
}));
jest.mock('@/hooks/useWide', () => ({
  __esModule: true,
  default: () => ({ wide: false, onWide: jest.fn() }),
}));
jest.mock('@/page/copilot/copilotStore', () => ({
  getCopilotWorkspace: () => ({ open: false }),
  useCopilotStore: (selector: (state: object) => unknown) => selector({}),
}));
jest.mock('@/page/copilot/useCopilotPanelLayout', () => ({
  COPILOT_PANEL_TRANSITION_MS: 0,
}));
jest.mock('@/page/resource/resourceStore', () => ({
  selectUseOmniboxEditor: jest.fn(),
  useResourceStore: () => false,
}));
jest.mock('@/page/resource/useResourceBodyDragAutoScroll', () => ({
  useResourceBodyDragAutoScroll: jest.fn(),
}));
jest.mock('./header', () => ({
  __esModule: true,
  default: ({ resource }: { resource: Resource | null }) => (
    <div
      data-resource-id={resource?.id ?? 'none'}
      data-testid="resource-header"
    />
  ),
}));
jest.mock('./Wrapper', () => ({
  __esModule: true,
  default: ({
    resource,
    loading,
    wide,
  }: {
    loading: boolean;
    resource: Resource | null;
    wide: boolean;
  }) => (
    <div
      data-resource-id={resource?.id}
      data-loading={String(loading)}
      data-testid="resource-wrapper"
      data-wide={String(wide)}
    />
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ResourceDetailView', () => {
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
    jest.clearAllMocks();
  });

  it('owns the complete resource header, separator, sizing, and content wrapper', async () => {
    const resource = {
      id: 'resource-a',
      name: 'Resource A',
      resource_type: 'resource',
    } as Resource;

    await act(async () => {
      root.render(
        <ResourceDetailView
          app={{ fire: jest.fn(), on: jest.fn() } as never}
          editPage={false}
          forbidden={false}
          loading={false}
          namespaceId="namespace-a"
          notFound={false}
          onResource={jest.fn()}
          resource={resource}
          resourceId={resource.id}
        />
      );
    });

    expect(
      container.querySelector('[data-testid="resource-header"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-testid="separator"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="resource-wrapper"]')
    ).not.toBeNull();
    expect(
      container
        .querySelector('[data-testid="resource-wrapper"]')
        ?.getAttribute('data-resource-id')
    ).toBe('resource-a');
  });

  it('does not render a stale resource title while the next resource is loading', async () => {
    const staleResource = {
      id: 'resource-a',
      name: 'Resource A',
      resource_type: 'resource',
    } as Resource;

    await act(async () => {
      root.render(
        <ResourceDetailView
          app={{ fire: jest.fn(), on: jest.fn() } as never}
          editPage={false}
          forbidden={false}
          loading={false}
          namespaceId="namespace-a"
          notFound={false}
          onResource={jest.fn()}
          resource={staleResource}
          resourceId="resource-b"
        />
      );
    });

    const header = container.querySelector('[data-testid="resource-header"]');
    const wrapper = container.querySelector('[data-testid="resource-wrapper"]');
    expect(header?.getAttribute('data-resource-id')).toBe('none');
    expect(wrapper?.getAttribute('data-resource-id')).toBeNull();
    expect(wrapper?.getAttribute('data-loading')).toBe('true');
  });
});
