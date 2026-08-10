import type { RssFolderLimits } from '@/page/sidebar/components/rss-folder';

import {
  getRssFolderQuotaExhausted,
  getRssFolderQuotaTooltipKey,
} from './rssFolderQuota';

function makeLimits(overrides?: Partial<RssFolderLimits>): RssFolderLimits {
  return {
    tier: 'basic',
    linkLimit: 1,
    folderPrivateLimit: 1,
    folderTeamLimit: 1,
    folderPrivateUsed: 0,
    folderTeamUsed: 0,
    ...overrides,
  };
}

describe('getRssFolderQuotaExhausted', () => {
  it('treats missing limits as not exhausted', () => {
    expect(getRssFolderQuotaExhausted(undefined)).toEqual({
      private: false,
      teamspace: false,
    });
  });

  it('is not exhausted while usage is below the limit', () => {
    expect(getRssFolderQuotaExhausted(makeLimits())).toEqual({
      private: false,
      teamspace: false,
    });
  });

  it('is exhausted per space once usage reaches the limit', () => {
    expect(
      getRssFolderQuotaExhausted(makeLimits({ folderPrivateUsed: 1 }))
    ).toEqual({ private: true, teamspace: false });
    expect(
      getRssFolderQuotaExhausted(makeLimits({ folderTeamUsed: 1 }))
    ).toEqual({ private: false, teamspace: true });
  });

  it('never exhausts an unlimited quota', () => {
    expect(
      getRssFolderQuotaExhausted(
        makeLimits({
          tier: 'premium',
          folderPrivateLimit: -1,
          folderTeamLimit: -1,
          folderPrivateUsed: 5,
          folderTeamUsed: 5,
        })
      )
    ).toEqual({ private: false, teamspace: false });
  });
});

describe('getRssFolderQuotaTooltipKey', () => {
  it('returns nothing when the space quota is not exhausted', () => {
    expect(
      getRssFolderQuotaTooltipKey(
        true,
        { private: true, teamspace: false },
        'teamspace'
      )
    ).toBeUndefined();
  });

  it('uses the personal copy for users without a teamspace', () => {
    expect(
      getRssFolderQuotaTooltipKey(
        false,
        { private: true, teamspace: false },
        'private'
      )
    ).toBe('rss_folder.create.personal_quota_exhausted');
  });

  it('uses the combined copy when both quotas are exhausted', () => {
    for (const spaceType of ['private', 'teamspace'] as const) {
      expect(
        getRssFolderQuotaTooltipKey(
          true,
          { private: true, teamspace: true },
          spaceType
        )
      ).toBe('rss_folder.create.all_quota_exhausted');
    }
  });

  it('uses per-space copy when only one quota is exhausted', () => {
    expect(
      getRssFolderQuotaTooltipKey(
        true,
        { private: true, teamspace: false },
        'private'
      )
    ).toBe('rss_folder.create.personal_quota_exhausted');
    expect(
      getRssFolderQuotaTooltipKey(
        true,
        { private: false, teamspace: true },
        'teamspace'
      )
    ).toBe('rss_folder.create.team_quota_exhausted');
  });
});
