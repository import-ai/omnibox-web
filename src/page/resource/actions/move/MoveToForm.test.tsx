/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';

import type { ResourcePickerResource } from '@/components/resourcePicker';

import MoveToForm from './MoveToForm';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

interface MockResourcePickerProps {
  loadFailed?: boolean;
  loading?: boolean;
  roots: ResourcePickerResource[];
}

let mockResourcePickerProps: MockResourcePickerProps;

jest.mock('@/components/resourcePicker', () => ({
  ResourcePicker: (props: MockResourcePickerProps) => {
    mockResourcePickerProps = props;
    return null;
  },
}));

const mockTranslate = (key: string) => key;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockTranslate }),
}));

jest.mock('@/page/sidebar/store', () => {
  const state = {
    resourceSorts: { private: undefined, teamspace: undefined },
  };
  return {
    useSidebarStore: (selector: (value: typeof state) => unknown) =>
      selector(state),
  };
});

jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn(),
  fetchSmartFolderChildren: jest.fn(),
  searchResources: jest.fn(),
}));

const fetchSortedWorkspaceRootResources = jest.fn();

jest.mock('@/components/resourcePicker/workspaceResourcePickerSort', () => ({
  ...jest.requireActual(
    '@/components/resourcePicker/workspaceResourcePickerSort'
  ),
  fetchSortedWorkspaceRootResources: (...args: unknown[]) =>
    fetchSortedWorkspaceRootResources(...args),
}));

describe('MoveToForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        <MoveToForm resourceIds={['source']} namespaceId="namespace" />
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
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MoveToForm resourceIds={['source']} namespaceId="namespace" />
      );
    });

    expect(mockResourcePickerProps).toMatchObject({
      loadFailed: true,
      loading: false,
      roots: [],
    });
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load move target roots',
      error
    );

    await act(async () => root.unmount());
    consoleError.mockRestore();
  });
});
