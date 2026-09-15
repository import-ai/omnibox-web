import {
  isFolderLikeResourceType,
  resourcePaneColumnClassName,
  shouldUseFullWidthResourcePane,
} from './useResourcePaneLayout';

describe('resource pane layout helpers', () => {
  it('treats folder types as folder-like and documents as full-width when the editor is on', () => {
    expect(isFolderLikeResourceType('folder')).toBe(true);
    expect(isFolderLikeResourceType('rss_folder')).toBe(true);
    expect(isFolderLikeResourceType('doc')).toBe(false);
    expect(shouldUseFullWidthResourcePane(true, 'doc')).toBe(true);
    expect(shouldUseFullWidthResourcePane(true, 'folder')).toBe(false);
    expect(shouldUseFullWidthResourcePane(false, 'doc')).toBe(false);
  });

  it('matches resource detail column widths', () => {
    expect(
      resourcePaneColumnClassName({
        wide: false,
        useFullWidth: false,
        sidebarOpen: true,
        large: false,
      })
    ).toEqual({
      'max-w-[680px]': true,
      'max-w-[800px]': false,
      'max-w-7xl': false,
    });
    expect(
      resourcePaneColumnClassName({
        wide: true,
        useFullWidth: false,
        sidebarOpen: false,
        large: true,
      })
    ).toEqual({
      'max-w-[680px]': false,
      'max-w-[800px]': false,
      'max-w-7xl': true,
    });
  });
});
