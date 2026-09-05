/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import SharedResourcePage from '.';

let mockShareContext: Record<string, unknown>;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/attributes', () => ({
  __esModule: true,
  default: () => <div data-testid="attributes" />,
}));
jest.mock('@/components/loading', () => 'div');
jest.mock('@/components/ui/Sidebar', () => ({
  useSidebar: () => ({ open: false }),
}));
jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
  setDocumentTitle: jest.fn(),
}));
jest.mock('@/page/auth/DeletedResourcePage', () => 'div');
jest.mock('../resource/folder', () => ({
  __esModule: true,
  default: ({ resourceId }: { resourceId: string }) => (
    <div data-testid="folder" data-resource-id={resourceId} />
  ),
}));
jest.mock('../resource/Render', () => ({
  __esModule: true,
  default: ({
    resource,
    forceOmniboxEditor,
    wide,
  }: {
    resource: { id: string };
    forceOmniboxEditor?: boolean;
    wide?: boolean;
  }) => (
    <div
      data-testid="render"
      data-resource-id={resource.id}
      data-force-omnibox-editor={forceOmniboxEditor ? 'true' : 'false'}
      data-wide={wide ? 'true' : 'false'}
    />
  ),
}));
jest.mock('../share', () => ({
  useShareContext: () => mockShareContext,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('SharedResourcePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('lists a shared rss folder through the generic children view', async () => {
    mockShareContext = {
      notFound: false,
      shareInfo: { id: 'share-1' },
      resource: {
        id: 'folder-1',
        name: 'RSS Folder',
        resource_type: 'rss_folder',
      },
      wide: false,
    };

    await act(async () => {
      root.render(<SharedResourcePage />);
    });

    const folder = container.querySelector('[data-testid="folder"]');
    expect(folder?.getAttribute('data-resource-id')).toBe('folder-1');
  });

  it('renders a shared rss item through the generic markdown view', async () => {
    mockShareContext = {
      notFound: false,
      shareInfo: { id: 'share-1' },
      resource: {
        id: 'item-1',
        name: 'Article',
        resource_type: 'rss_item',
        read_only: true,
        content: '# Article',
      },
      wide: false,
    };

    await act(async () => {
      root.render(<SharedResourcePage />);
    });

    const render = container.querySelector('[data-testid="render"]');
    const titleContainer = container.querySelector('h1')?.parentElement;
    expect(container.firstElementChild?.classList).toContain(
      'shared-resource-page'
    );
    expect(render?.getAttribute('data-resource-id')).toBe('item-1');
    expect(render?.getAttribute('data-force-omnibox-editor')).toBe('true');
    expect(render?.getAttribute('data-wide')).toBe('false');
    expect(titleContainer?.classList.contains('max-w-[680px]')).toBe(true);
    expect(container.querySelector('[data-testid="folder"]')).toBeNull();
  });
});
