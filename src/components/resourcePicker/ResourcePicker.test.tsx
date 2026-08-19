import { renderToStaticMarkup } from 'react-dom/server';

import { ResourcePicker } from './ResourcePicker';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const root = {
  id: 'root',
  name: 'Root',
  parent_id: null,
  resource_type: 'folder' as const,
};

function renderPicker({
  loadFailed = false,
  loading = false,
  roots = [],
}: {
  loadFailed?: boolean;
  loading?: boolean;
  roots?: (typeof root)[];
} = {}) {
  return renderToStaticMarkup(
    <ResourcePicker
      loadFailed={loadFailed}
      loading={loading}
      roots={roots}
      loadChildren={jest.fn().mockResolvedValue([])}
      onSelect={jest.fn()}
    />
  );
}

describe('ResourcePicker', () => {
  it('shows loading instead of the empty state while roots are loading', () => {
    const html = renderPicker({ loading: true });

    expect(html).toContain('loading');
    expect(html).not.toContain('resource_picker.empty');
  });

  it('shows the empty state after loading completes without roots', () => {
    const html = renderPicker();

    expect(html).toContain('resource_picker.empty');
    expect(html).not.toContain('loading');
  });

  it('shows an error instead of the empty state when roots fail to load', () => {
    const html = renderPicker({ loadFailed: true });

    expect(html).toContain('resource_picker.load_failed');
    expect(html).not.toContain('resource_picker.empty');
  });

  it('shows the resource tree after roots load', () => {
    const html = renderPicker({ roots: [root] });

    expect(html).toContain('Root');
    expect(html).not.toContain('resource_picker.empty');
  });
});
