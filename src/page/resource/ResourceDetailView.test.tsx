/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import type { Resource } from '@/interface';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

import type { IActionProps } from './actions';
import ResourceDetailView from './ResourceDetailView';
import { useResourceStore } from './resourceStore';

let resizeCallback: ResizeObserverCallback;

jest.mock('@/assets/icons/ChatIcon', () => ({ ChatIcon: () => null }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/SidebarTriggerButton', () => ({
  SidebarTriggerButton: () => null,
}));
jest.mock('./actions', () => ({ __esModule: true, default: () => null }));
jest.mock('./header/BreadcrumbMain', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock(
  '@/components/attributes/resource-tasks/ResourceTasksContext',
  () => ({
    ResourceTasksProvider: ({ children }: React.PropsWithChildren) => children,
  })
);
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
jest.mock('@/page/resource/useResourceBodyDragAutoScroll', () => ({
  useResourceBodyDragAutoScroll: jest.fn(),
}));
jest.mock('./header', () => {
  const Header =
    jest.requireActual<typeof import('./header')>('./header').default;
  return {
    __esModule: true,
    default: (props: IActionProps) => (
      <div
        data-resource-id={props.resource?.id ?? 'none'}
        data-testid="resource-header"
      >
        <Header {...props} />
      </div>
    ),
  };
});
jest.mock('./Wrapper', () => ({
  __esModule: true,
  default: ({
    resource,
    loading,
    scrollToLine,
    showToc,
    wide,
  }: {
    loading: boolean;
    resource: Resource | null;
    scrollToLine?: number;
    showToc: boolean;
    wide: boolean;
  }) => (
    <div
      data-resource-id={resource?.id}
      data-loading={String(loading)}
      data-scroll-to-line={scrollToLine ?? ''}
      data-show-toc={String(showToc)}
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
  let originalResizeObserver: typeof ResizeObserver | undefined;
  const resource: Resource = {
    id: 'resource-a',
    name: 'Resource A',
    resource_type: 'doc',
    space_type: 'private',
    parent_id: 'root',
    has_children: false,
    content: '# Resource A',
  };

  async function renderResource(
    currentResource = resource,
    resourceId = currentResource.id,
    scrollToLine?: number
  ) {
    await act(async () => {
      root.render(
        <TooltipProvider>
          <ResourceDetailView
            app={{ fire: jest.fn(), on: jest.fn() } as never}
            editPage={false}
            forbidden={false}
            loading={false}
            namespaceId="namespace-a"
            notFound={false}
            onResource={jest.fn()}
            resource={currentResource}
            resourceId={resourceId}
            scrollToLine={scrollToLine}
          />
        </TooltipProvider>
      );
    });
  }

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.setItem('uid', 'viewer');
    useResourceStore
      .getState()
      .setFeaturePreviews('viewer', { editor_v2: false });
    useCopilotStore.getState().reset('namespace-a');
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = class implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      disconnect() {}
      observe() {}
      unobserve() {}
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    global.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
    jest.clearAllMocks();
    localStorage.removeItem('uid');
  });

  it('owns the complete resource header, separator, sizing, and content wrapper', async () => {
    await renderResource(resource, resource.id, 12);

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
        ?.getAttribute('data-scroll-to-line')
    ).toBe('12');
    expect(
      container
        .querySelector('[data-testid="resource-wrapper"]')
        ?.getAttribute('data-resource-id')
    ).toBe('resource-a');
  });

  it('does not render a stale resource title while the next resource is loading', async () => {
    await renderResource(resource, 'resource-b');

    const header = container.querySelector('[data-testid="resource-header"]');
    const wrapper = container.querySelector('[data-testid="resource-wrapper"]');
    expect(header?.getAttribute('data-resource-id')).toBe('none');
    expect(wrapper?.getAttribute('data-resource-id')).toBeNull();
    expect(wrapper?.getAttribute('data-loading')).toBe('true');
  });

  it('uses compact layout when the resource pane becomes narrow', async () => {
    await renderResource();

    const resourceView = container.querySelector('main');
    const scrollContainer = resourceView?.querySelector(
      '.overflow-y-auto'
    ) as HTMLDivElement;
    Object.defineProperty(scrollContainer, 'clientWidth', {
      configurable: true,
      value: 900,
    });
    await act(async () => {
      resizeCallback([], {} as ResizeObserver);
    });
    expect(resourceView?.classList).not.toContain(
      'resource-detail-view--compact'
    );
    expect(
      container
        .querySelector('[data-testid="resource-wrapper"]')
        ?.getAttribute('data-show-toc')
    ).toBe('true');

    Object.defineProperty(scrollContainer, 'clientWidth', {
      configurable: true,
      value: 700,
    });
    await act(async () => {
      resizeCallback([], {} as ResizeObserver);
    });
    expect(resourceView?.classList).toContain('resource-detail-view--compact');
    expect(
      container
        .querySelector('[data-testid="resource-wrapper"]')
        ?.getAttribute('data-show-toc')
    ).toBe('false');
  });

  it('falls back to window resize when ResizeObserver is unavailable', async () => {
    global.ResizeObserver = undefined as unknown as typeof ResizeObserver;
    await renderResource();

    const resourceView = container.querySelector('main');
    const scrollContainer = resourceView?.querySelector(
      '.overflow-y-auto'
    ) as HTMLDivElement;
    Object.defineProperty(scrollContainer, 'clientWidth', {
      configurable: true,
      value: 900,
    });
    await act(async () => window.dispatchEvent(new Event('resize')));
    expect(resourceView?.classList).not.toContain(
      'resource-detail-view--compact'
    );

    Object.defineProperty(scrollContainer, 'clientWidth', {
      configurable: true,
      value: 700,
    });
    await act(async () => window.dispatchEvent(new Event('resize')));
    expect(resourceView?.classList).toContain('resource-detail-view--compact');
  });

  it('hides the comment action and closes the open sidebar when switching to the legacy editor', async () => {
    useResourceStore.getState().setFeaturePreview('viewer', 'editor_v2', true);
    await renderResource();
    const commentButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="resource_comments.title"]'
    );
    expect(commentButton).not.toBeNull();
    await act(async () => commentButton?.click());
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a').open
    ).toBe(true);

    await act(async () => {
      useResourceStore
        .getState()
        .setFeaturePreview('viewer', 'editor_v2', false);
    });
    expect(
      container.querySelector('button[aria-label="resource_comments.title"]')
    ).toBeNull();
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a').open
    ).toBe(false);
    expect(
      JSON.parse(sessionStorage.getItem('resource-comments-panel') ?? '{}')
    ).not.toHaveProperty('namespace-a');

    await act(async () => {
      useResourceStore
        .getState()
        .setFeaturePreview('viewer', 'editor_v2', true);
    });
    expect(
      container.querySelector('button[aria-label="resource_comments.title"]')
    ).not.toBeNull();
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a').open
    ).toBe(false);
  });

  it('keeps a normal Copilot conversation open when switching editors', async () => {
    useResourceStore.getState().setFeaturePreview('viewer', 'editor_v2', true);
    useCopilotStore.getState().open('namespace-a');
    await renderResource();
    await act(async () => {
      useResourceStore
        .getState()
        .setFeaturePreview('viewer', 'editor_v2', false);
    });
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a').open
    ).toBe(true);
    expect(
      container.querySelector('button[aria-label="resource_comments.title"]')
    ).toBeNull();
  });

  it('clears a restored comment sidebar when loading with the legacy editor', async () => {
    sessionStorage.setItem(
      'resource-comments-panel',
      JSON.stringify({ 'namespace-a': true })
    );
    await renderResource();
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a').open
    ).toBe(false);
    expect(
      container.querySelector('button[aria-label="resource_comments.title"]')
    ).toBeNull();
    expect(
      JSON.parse(sessionStorage.getItem('resource-comments-panel') ?? '{}')
    ).not.toHaveProperty('namespace-a');
  });

  it('hides comments when the editor feature flag is absent', async () => {
    useResourceStore.getState().setFeaturePreviews('viewer', {});
    await renderResource();
    expect(
      container.querySelector('button[aria-label="resource_comments.title"]')
    ).toBeNull();
  });
});
