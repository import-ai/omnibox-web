import {
  liveContributorLabel,
  truncateContributorLabel,
} from './resourcePeople';

describe('truncateContributorLabel', () => {
  it('keeps a short name and counts unicode characters', () => {
    expect(truncateContributorLabel('荔枝（lizhi）')).toBe('荔枝（lizhi）');
    expect(truncateContributorLabel('一二三四五六七八九十一二三四五六七')).toBe(
      '一二三四五六七八九十一二三四五六…'
    );
  });
});

describe('liveContributorLabel', () => {
  it('uses the refreshed member name and keeps a frozen label without one', () => {
    expect(
      liveContributorLabel('旧名（bob）', {
        id: 'user-b',
        username: 'bob',
        nickname: '新名',
      })
    ).toBe('新名（bob）');
    expect(liveContributorLabel('旧名（bob）', null)).toBe('旧名（bob）');
  });
});
