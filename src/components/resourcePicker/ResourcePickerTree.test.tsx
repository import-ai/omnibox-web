import { renderToStaticMarkup } from 'react-dom/server';

import { ResourcePickerTree } from './ResourcePickerTree';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/assets/icons/ResourceIcon', () => ({
  __esModule: true,
  default: ({ expand }: { expand: boolean }) => (
    <span data-expanded={String(expand)} />
  ),
}));

const rssFolder = {
  id: 'rss-folder-id',
  name: 'Morning Feeds',
  parent_id: 'private-root',
  resource_type: 'rss_folder' as const,
  has_children: false,
};

function renderTree({
  resourcesAreSmartFolderResults = false,
  searchActive = false,
} = {}) {
  return renderToStaticMarkup(
    <ResourcePickerTree
      childrenById={{ [rssFolder.id]: [] }}
      enableManagedFolders
      expandedIds={new Set([rssFolder.id])}
      loadingIds={new Set()}
      onSelect={jest.fn()}
      resources={[rssFolder]}
      resourcesAreSmartFolderResults={resourcesAreSmartFolderResults}
      searchActive={searchActive}
      toggleExpand={jest.fn().mockResolvedValue(undefined)}
    />
  );
}

describe('ResourcePickerTree', () => {
  it('keeps an empty managed folder expandable outside terminal results', () => {
    const html = renderTree();

    expect(html).toContain('resource_picker.collapse_resource');
    expect(html).toContain('sidebar.folder_empty');
    expect(html).toContain('data-expanded="true"');
  });

  it('renders managed folders as collapsed leaves in search results', () => {
    const html = renderTree({ searchActive: true });

    expect(html).not.toContain('resource_picker.collapse_resource');
    expect(html).not.toContain('resource_picker.expand_resource');
    expect(html).not.toContain('sidebar.folder_empty');
    expect(html).toContain('data-expanded="false"');
  });

  it('does not inherit expansion for smart folder results with the same id', () => {
    const html = renderTree({ resourcesAreSmartFolderResults: true });

    expect(html).not.toContain('resource_picker.collapse_resource');
    expect(html).not.toContain('resource_picker.expand_resource');
    expect(html).not.toContain('sidebar.folder_empty');
    expect(html).toContain('data-expanded="false"');
  });
});
