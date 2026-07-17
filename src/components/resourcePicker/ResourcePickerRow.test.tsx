import { renderToStaticMarkup } from 'react-dom/server';

import { ResourcePickerRow } from './ResourcePickerRow';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const resource = {
  id: 'selected-resource',
  name: 'Selected resource',
  parent_id: null,
  resource_type: 'folder' as const,
};

describe('ResourcePickerRow', () => {
  it('renders the selected state and checkmark', () => {
    const html = renderToStaticMarkup(
      <ResourcePickerRow
        canExpand={false}
        depth={0}
        expanded={false}
        loading={false}
        onSelect={jest.fn()}
        onToggle={jest.fn()}
        resource={resource}
        selected
      />
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('lucide-check');
    expect(html).toContain('bg-secondary');
  });

  it('omits the checkmark when the resource is not selected', () => {
    const html = renderToStaticMarkup(
      <ResourcePickerRow
        canExpand={false}
        depth={0}
        expanded={false}
        loading={false}
        onSelect={jest.fn()}
        onToggle={jest.fn()}
        resource={resource}
        selected={false}
      />
    );

    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('lucide-check');
  });
});
