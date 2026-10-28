import { truncateContributorLabel } from './resourcePeople';

describe('truncateContributorLabel', () => {
  it('keeps a short name and counts unicode characters', () => {
    expect(truncateContributorLabel('荔枝（lizhi）')).toBe('荔枝（lizhi）');
    expect(truncateContributorLabel('一二三四五六七八九十一二三四五六七')).toBe(
      '一二三四五六七八九十一二三四五六…'
    );
  });
});
