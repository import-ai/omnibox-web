import * as en from './en.json';
import * as zh from './zh.json';

describe('folder empty state translations', () => {
  it('uses dedicated localized sidebar copy', () => {
    expect(zh.sidebar.folder_empty).toBe('空空如也');
    expect(en.sidebar.folder_empty).toBe('Nothing here');
  });

  it('preserves the smart folder detail guidance', () => {
    expect(zh.smart_folder.empty).toBe('暂无匹配的资源，可修改筛选条件。');
    expect(zh.rss_folder.empty).toBe('暂无内容');
  });

  it('does not change unrelated empty states', () => {
    expect(zh.trash.empty).toBe('空空如也');
  });
});
