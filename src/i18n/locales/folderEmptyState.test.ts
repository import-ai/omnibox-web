import * as en from './en.json';
import * as zh from './zh.json';

describe('folder empty state translations', () => {
  it('uses dedicated localized sidebar copy', () => {
    expect(zh.sidebar.folder_empty).toBe('空空如也');
    expect(en.sidebar.folder_empty).toBe('Nothing here');
  });

  it('preserves the smart folder detail guidance', () => {
    expect(zh.smart_folder.empty).toBe('暂无匹配的资源，可修改筛选条件。');
    expect(zh.rss_folder.empty).toBe('空空如也');
    expect(en.rss_folder.empty).toBe('Nothing here');
    expect(zh.rss_folder.loading).toBe('正在加载…');
    expect(en.rss_folder.loading).toBe('Loading...');
    expect(zh.rss_folder.load_failed).toBe('加载失败，请稍后重试');
    expect(en.rss_folder.load_failed).toBe(
      'Failed to load. Please try again later.'
    );
  });

  it('does not change unrelated empty states', () => {
    expect(zh.trash.empty).toBe('空空如也');
  });
});
