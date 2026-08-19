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
  has_children: true,
};

describe('WorkspaceResourcePicker', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSelect = jest.fn();

  beforeEach(async () => {
    onSelect.mockReset();
    fetchChildren.mockReset();
    fetchChildren.mockResolvedValue([]);
    fetchSortedWorkspaceRootResources.mockReset();
    fetchSortedWorkspaceRootResources.mockResolvedValue({
      private: {
        id: 'private-root',
        name: 'Private',
        parent_id: null,
        resource_type: 'folder',
        children: [rssFolder],
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

  // A feed folder is chat context like any other folder: attaching it attaches
  // the articles inside it.
  it('offers an rss folder as a selectable chat context', async () => {
    const row = rowFor(rssFolder.name);
    expect(row).toBeDefined();
    expect(row!.disabled).toBe(false);

    await act(async () => {
      row!.click();
    });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: rssFolder.id })
    );
  });

  it('expands an rss folder to its articles', async () => {
    fetchChildren.mockResolvedValue([
      {
        id: 'rss-item-id',
        name: 'An article',
        parent_id: rssFolder.id,
        resource_type: 'rss_item',
      },
    ]);
    const expand = [
      ...container.querySelectorAll<HTMLButtonElement>('button'),
    ].find(
      button =>
        button.getAttribute('aria-label') === 'resource_picker.expand_resource'
    );
    expect(expand).toBeDefined();

    await act(async () => {
      expand!.click();
    });

    expect(fetchChildren).toHaveBeenCalled();
    expect(rowFor('An article')).toBeDefined();
  });
});
