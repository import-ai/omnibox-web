/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server.node';

import type { ResourcePickerResource } from '@/components/resourcePicker';
import {
  fetchChildren,
  fetchSmartFolderChildren,
  searchResources,
} from '@/service/resource';
import { RSS_ITEM_TREE_LIMIT } from '@/service/resourceSort';

import { ChooseResourceTree } from './ChooseResourceTree';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

interface MockResourcePickerProps {
  loadFailed?: boolean;
  loading?: boolean;
  roots: ResourcePickerResource[];
  loadChildren: (
    resource: ResourcePickerResource
  ) => Promise<ResourcePickerResource[]>;
  searchResources?: (query: string) => Promise<ResourcePickerResource[]>;
  beforeList?: ReactNode;
}

let mockResourcePickerProps: MockResourcePickerProps;

jest.mock('@/components/resourcePicker', () => ({
  ResourcePicker: (props: MockResourcePickerProps) => {
    mockResourcePickerProps = props;
    return null;
  },
}));

jest.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenuSeparator: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockTranslate }),
}));

const mockTranslate = (key: string) => key;

const fetchSortedWorkspaceRootResources = jest.fn();

jest.mock('@/components/resourcePicker/workspaceResourcePickerSort', () => ({
  ...jest.requireActual(
    '@/components/resourcePicker/workspaceResourcePickerSort'
  ),
  fetchSortedWorkspaceRootResources: (...args: unknown[]) =>
    fetchSortedWorkspaceRootResources(...args),
}));

jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn(),
  fetchRootResources: jest.fn(),
  fetchSmartFolderChildren: jest.fn(),
  searchResources: jest.fn(),
}));

const smartFolder = {
  id: 'smart-folder',
  name: 'Smart folder',
  parent_id: null,
  resource_type: 'smart_folder' as const,
};
const childFolder = {
  id: 'child-folder',
  name: 'Child folder',
  parent_id: smartFolder.id,
  resource_type: 'folder' as const,
};

function renderTree(disabledIds?: string[]) {
  renderToStaticMarkup(
    <ChooseResourceTree
      namespaceId="namespace"
      resourceId="root"
      disabledIds={disabledIds}
      disabledTooltip="Operating resource"
      disableSmartFolders
      smartFolderDisabledTooltip="Smart folder unsupported"
      onChange={jest.fn()}
    />
  );
}

describe('ChooseResourceTree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchSortedWorkspaceRootResources.mockResolvedValue({});
    jest.mocked(searchResources).mockResolvedValue([smartFolder]);
    jest.mocked(fetchSmartFolderChildren).mockResolvedValue([childFolder]);
  });

  it('keeps lazy-loaded folders inside a disabled smart folder selectable', async () => {
    renderTree();

    const [decoratedSmartFolder] =
      await mockResourcePickerProps.searchResources!('smart');
    const [decoratedChild] =
      await mockResourcePickerProps.loadChildren(decoratedSmartFolder);

    expect(decoratedSmartFolder).toMatchObject({
      disabled: true,
      disabledTooltip: 'Smart folder unsupported',
    });
    expect(decoratedChild.disabled).toBe(false);
    expect(decoratedChild.disabledTooltip).toBeUndefined();
  });

  it('bounds the children it loads for an rss folder', async () => {
    renderTree();
    jest.mocked(fetchChildren).mockResolvedValue([]);

    await mockResourcePickerProps.loadChildren({
      id: 'rss-folder',
      name: 'Feed',
      parent_id: null,
      resource_type: 'rss_folder',
    });
    // A feed's branch shows its newest page, not its whole archive.
    expect(fetchChildren).toHaveBeenCalledWith(
      'namespace',
      'rss-folder',
      expect.anything(),
      { params: { limit: RSS_ITEM_TREE_LIMIT } }
    );

    await mockResourcePickerProps.loadChildren({
      id: 'folder',
      name: 'Folder',
      parent_id: null,
      resource_type: 'folder',
    });
    expect(fetchChildren).toHaveBeenLastCalledWith(
      'namespace',
      'folder',
      expect.anything(),
      { params: undefined }
    );
  });

  it('still disables lazy-loaded descendants of an operating resource', async () => {
    renderTree([smartFolder.id]);

    const [decoratedSmartFolder] =
      await mockResourcePickerProps.searchResources!('smart');
    const [decoratedChild] =
      await mockResourcePickerProps.loadChildren(decoratedSmartFolder);

    expect(decoratedChild).toMatchObject({
      disabled: true,
      disabledTooltip: 'Operating resource',
    });
  });

  it('tracks root loading until an empty response succeeds', async () => {
    let resolveRoots!: (value: object) => void;
    fetchSortedWorkspaceRootResources.mockReturnValue(
      new Promise(resolve => {
        resolveRoots = resolve;
      })
    );
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ChooseResourceTree
          namespaceId="namespace"
          resourceId="root"
          onChange={jest.fn()}
        />
      );
    });
    expect(mockResourcePickerProps).toMatchObject({
      loadFailed: false,
      loading: true,
      roots: [],
    });

    await act(async () => resolveRoots({}));
    expect(mockResourcePickerProps).toMatchObject({
      loadFailed: false,
      loading: false,
      roots: [],
    });

    await act(async () => root.unmount());
  });

  it('reports root loading failures', async () => {
    const error = new Error('network');
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    fetchSortedWorkspaceRootResources.mockRejectedValue(error);
    const container = document.createElement('div');
    const root: Root = createRoot(container);

    await act(async () => {
      root.render(
        <ChooseResourceTree
          namespaceId="namespace"
          resourceId="root"
          onChange={jest.fn()}
        />
      );
    });

    expect(mockResourcePickerProps).toMatchObject({
      loadFailed: true,
      loading: false,
      roots: [],
    });
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load resource select roots',
      error
    );

    await act(async () => root.unmount());
    consoleError.mockRestore();
  });
});
