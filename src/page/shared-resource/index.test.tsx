/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import SharedResourcePage from '.';

let mockShareContext: Record<string, unknown>;
let mockOutletContext: { showToc?: boolean } | null = { showToc: true };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useOutletContext: () => mockOutletContext,
}));
jest.mock('@/components/loading', () => 'div');
jest.mock('@/lib/utils', () => ({
  setDocumentTitle: jest.fn(),
}));
jest.mock('@/page/auth/DeletedResourcePage', () => 'div');
jest.mock('@/page/resource/Page', () => ({
  __esModule: true,
  default: ({
    resource,
    apiPrefix,
    navigationPrefix,
    readOnly,
    wide,
    showToc,
  }: {
    resource: { id: string; resource_type: string };
    apiPrefix?: string;
    navigationPrefix?: string;
    readOnly?: boolean;
    wide: boolean;
    showToc: boolean;
  }) => (
    <div
      data-testid={
        resource.resource_type === 'folder' ||
        resource.resource_type === 'smart_folder' ||
        resource.resource_type === 'rss_folder'
          ? 'folder'
          : 'render'
      }
      data-resource-id={resource.id}
      data-api-prefix={apiPrefix}
      data-navigation-prefix={navigationPrefix}
      data-readonly={String(!!readOnly)}
      data-wide={String(wide)}
      data-show-toc={String(showToc)}
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
    mockOutletContext = { showToc: true };
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
    expect(folder?.getAttribute('data-api-prefix')).toBe(
      '/shares/share-1/resources'
    );
    expect(folder?.getAttribute('data-navigation-prefix')).toBe('/s/share-1');
    expect(folder?.getAttribute('data-readonly')).toBe('true');
  });

  it('renders a shared rss item through the generic markdown view', async () => {
    mockOutletContext = { showToc: false };
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
      wide: true,
    };

    await act(async () => {
      root.render(<SharedResourcePage />);
    });

    const render = container.querySelector('[data-testid="render"]');
    expect(render?.getAttribute('data-resource-id')).toBe('item-1');
    expect(render?.getAttribute('data-wide')).toBe('true');
    expect(render?.getAttribute('data-show-toc')).toBe('false');
    expect(container.querySelector('[data-testid="folder"]')).toBeNull();
  });
});
