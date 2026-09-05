import { readFileSync } from 'node:fs';

const css = readFileSync('src/page/resource/resourceEditor.css', 'utf8');

describe('resource editor overlay stacking', () => {
  it('keeps the document outline below app menus', () => {
    expect(css).toContain('z-index: 20 !important');
    expect(css).not.toContain('z-index: 200 !important');
  });

  it('positions the shared document outline near the page edge', () => {
    expect(css).toContain(
      '.shared-resource-page .resource-readonly-editor .toc-sidebar-wrapper'
    );
    expect(css).toContain('left: 1.5rem !important');
  });
});
