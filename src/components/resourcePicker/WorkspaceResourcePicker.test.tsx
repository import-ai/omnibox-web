/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { WorkspaceResourcePicker } from './WorkspaceResourcePicker';

const mockFetchRoots = jest.fn();
const mockResourceSorts = {};
const mockT = (key: string) => key;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: (selector: (state: object) => unknown) =>
    selector({ resourceSorts: mockResourceSorts }),
}));

jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn(),
  fetchRootResources: jest.fn(),
  fetchSmartFolderChildren: jest.fn(),
  searchResources: jest.fn(),
}));

jest.mock('./workspaceResourcePickerSort', () => ({
  ...jest.requireActual('./workspaceResourcePickerSort'),
  fetchSortedWorkspaceRootResources: (...args: unknown[]) =>
    mockFetchRoots(...args),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkspaceResourcePicker', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockFetchRoots.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  it('shows loading until workspace roots resolve', async () => {
    let resolveRoots!: (value: object) => void;
    mockFetchRoots.mockReturnValue(
      new Promise(resolve => {
        resolveRoots = resolve;
      })
    );

    await act(async () => {
      root.render(
        <WorkspaceResourcePicker namespaceId="namespace" onSelect={jest.fn()} />
      );
    });
    expect(container.textContent).toContain('loading');
    expect(container.textContent).not.toContain('resource_picker.empty');

    await act(async () => {
      resolveRoots({
        private: {
          id: 'root',
          name: 'Root',
          parent_id: null,
          resource_type: 'folder',
          children: [],
        },
      });
      await Promise.resolve();
    });
    expect(container.textContent).toContain('private');
    expect(container.textContent).not.toContain('loading');
  });

  it('shows an error instead of an empty state when roots fail to load', async () => {
    const error = new Error('load failed');
    mockFetchRoots.mockRejectedValue(error);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await act(async () => {
      root.render(
        <WorkspaceResourcePicker namespaceId="namespace" onSelect={jest.fn()} />
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('resource_picker.load_failed');
    expect(container.textContent).not.toContain('resource_picker.empty');
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load resource picker roots',
      error
    );
  });
});
