import * as zh from './zh.json';

describe('folder empty state translations', () => {
  it.each(['smart_folder', 'rss_folder'] as const)(
    'uses the shared empty copy for %s',
    folderType => {
      expect(zh[folderType].empty).toBe('空空如也');
    }
  );
});
