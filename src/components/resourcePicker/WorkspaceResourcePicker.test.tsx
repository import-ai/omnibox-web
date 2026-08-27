/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { WorkspaceResourcePicker } from './WorkspaceResourcePicker';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// t and the sort map must keep a stable identity across renders, as the real
// ones do: the picker's effects depend on them.
jest.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const fetchChildren = jest.fn();
const fetchSmartFolderChildren = jest.fn();
const searchResources = jest.fn();

jest.mock('@/service/resource', () => ({
  fetchChildren: (...args: unknown[]) => fetchChildren(...args),
  fetchSmartFolderChildren: (...args: unknown[]) =>
    fetchSmartFolderChildren(...args),
  searchResources: (...args: unknown[]) => searchResources(...args),
}));

jest.mock('@/service/resourceSort', () => ({
  rssTreeChildrenParams: () => undefined,
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

const fetchSortedWorkspaceRootResources = jest.fn();

jest.mock('./workspaceResourcePickerSort', () => ({
  fetchSortedWorkspaceRootResources: (...args: unknown[]) =>
    fetchSortedWorkspaceRootResources(...args),
  getWorkspacePickerSort: () => undefined,
  setWorkspacePickerSpace: (resource: unknown) => resource,
}));

const rssFolder = {
  id: 'rss-folder-id',
  name: 'Morning Feeds',
  parent_id: 'private-root',
  resource_type: 'rss_folder',
  has_children: false,
};
const smartFolder = {
  id: 'smart-folder-id',
  name: 'Saved Search',
  parent_id: 'private-root',
  resource_type: 'smart_folder',
  has_children: false,
};

describe('WorkspaceResourcePicker', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSelect = jest.fn();

  beforeEach(async () => {
    onSelect.mockReset();
    fetchChildren.mockReset();
    fetchChildren.mockResolvedValue([]);
    fetchSmartFolderChildren.mockReset();
    fetchSmartFolderChildren.mockResolvedValue([]);
    fetchSortedWorkspaceRootResources.mockReset();
    fetchSortedWorkspaceRootResources.mockResolvedValue({
      private: {
        id: 'private-root',
        name: 'Private',
        parent_id: null,
        resource_type: 'folder',
        children: [rssFolder, smartFolder],
      },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        (
          <WorkspaceResourcePicker
            namespaceId="namespace-id"
            onSelect={onSelect}
          />
        ) as ReactNode
      );
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const rowFor = (name: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.textContent?.trim() === name
    );

  const expandFor = (name: string) =>
    rowFor(
      name
    )?.parentElement?.parentElement?.querySelector<HTMLButtonElement>(
      'button[aria-label]'
    );

  // A feed folder is chat context like any other folder: attaching it attaches
  // the articles inside it.
  it.each([rssFolder, smartFolder])(
    'offers $resource_type as a selectable chat context',
    async folder => {
      const row = rowFor(folder.name);
      expect(row).toBeDefined();
      expect(row!.disabled).toBe(false);

      await act(async () => {
        row!.click();
      });

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: folder.id })
      );
    }
  );

  it.each([rssFolder, smartFolder])(
    'keeps an empty $resource_type expandable and shows its empty state',
    async folder => {
      const expand = expandFor(folder.name);
      expect(expand).toBeDefined();

      await act(async () => {
        expand!.click();
      });

      expect(container.textContent).toContain('sidebar.folder_empty');
    }
  );

  it('expands an rss folder to its articles', async () => {
    fetchChildren.mockResolvedValue([
      {
        id: 'rss-item-id',
        name: 'An article',
        parent_id: rssFolder.id,
        resource_type: 'rss_item',
      },
    ]);
    const expand = expandFor(rssFolder.name);
    expect(expand).toBeDefined();

    await act(async () => {
      expand!.click();
    });

    expect(fetchChildren).toHaveBeenCalled();
    expect(rowFor('An article')).toBeDefined();
  });
});
