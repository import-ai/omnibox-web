import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { ResourcePickerResource } from '@/components/resourcePicker';
import { fetchSmartFolderChildren, searchResources } from '@/service/resource';

import { ChooseResourceTree } from './ChooseResourceTree';

interface MockResourcePickerProps {
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
  useTranslation: () => ({ t: (key: string) => key }),
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
});
