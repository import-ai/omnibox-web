/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { ResourcePickerResource } from './resourcePickerTypes';
import { useResourcePickerController } from './useResourcePickerController';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const NO_ROOT_IDS: string[] = [];
const NO_SEARCH = {};

const disabledFolder: ResourcePickerResource = {
  id: 'disabled-folder',
  name: 'Disabled',
  parent_id: null,
  resource_type: 'folder',
  has_children: true,
  disabled: true,
};

const folder: ResourcePickerResource = {
  id: 'folder',
  name: 'Folder',
  parent_id: null,
  resource_type: 'folder',
  has_children: true,
};

describe('useResourcePickerController', () => {
  let container: HTMLDivElement;
  let root: Root;
  let controller: ReturnType<typeof useResourcePickerController>;
  const loadChildren = jest.fn();

  function HookProbe({ roots }: { roots: ResourcePickerResource[] }) {
    controller = useResourcePickerController(
      { defaultExpandedRootIds: NO_ROOT_IDS, loadChildren, roots },
      NO_SEARCH
    );
    return null;
  }

  beforeEach(() => {
    loadChildren.mockReset();
    loadChildren.mockResolvedValue([]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const render = async (roots: ResourcePickerResource[]) => {
    await act(async () => {
      root.render((<HookProbe roots={roots} />) as ReactNode);
    });
  };

  it('does not expand — or load the children of — a disabled resource', async () => {
    await render([disabledFolder]);
    loadChildren.mockClear();

    await act(async () => {
      await controller.toggleExpand(disabledFolder);
    });

    // Nothing under a greyed-out node is a valid pick, so expanding it would
    // only fetch rows the user cannot choose.
    expect(loadChildren).not.toHaveBeenCalled();
    expect(controller.expandedIds.has(disabledFolder.id)).toBe(false);
  });

  it('still collapses a disabled resource that is already expanded', async () => {
    await render([folder]);

    await act(async () => {
      await controller.toggleExpand(folder);
    });
    expect(controller.expandedIds.has(folder.id)).toBe(true);

    await act(async () => {
      await controller.toggleExpand({ ...folder, disabled: true });
    });
    expect(controller.expandedIds.has(folder.id)).toBe(false);
  });

  it('expands a resource that is not disabled', async () => {
    await render([folder]);
    loadChildren.mockClear();
    loadChildren.mockResolvedValue([
      {
        id: 'child',
        name: 'Child',
        parent_id: folder.id,
        resource_type: 'doc',
      },
    ]);

    await act(async () => {
      await controller.toggleExpand(folder);
    });

    expect(loadChildren).toHaveBeenCalledWith(folder);
    expect(controller.expandedIds.has(folder.id)).toBe(true);
    expect(controller.childrenById[folder.id]).toHaveLength(1);
  });
});
