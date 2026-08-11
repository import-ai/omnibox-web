import type { RssFolderLimits } from '@/page/sidebar/components/rss-folder';

import {
  countRssFoldersBySpace,
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

  it('uses the higher of API used and local tree counts', () => {
    expect(
      getRssFolderQuotaExhausted(makeLimits({ folderPrivateUsed: 0 }), {
        private: 1,
        teamspace: 0,
      })
    ).toEqual({ private: true, teamspace: false });
    expect(
      getRssFolderQuotaExhausted(makeLimits({ folderPrivateUsed: 1 }), {
        private: 0,
        teamspace: 0,
      })
    ).toEqual({ private: true, teamspace: false });
  });
});

describe('countRssFoldersBySpace', () => {
  it('counts loaded rss folders per space type', () => {
    expect(
      countRssFoldersBySpace({
        a: { resourceType: 'rss_folder', spaceType: 'private' },
        b: { resourceType: 'rss_folder', spaceType: 'private' },
        c: { resourceType: 'rss_folder', spaceType: 'teamspace' },
        d: { resourceType: 'folder', spaceType: 'private' },
      })
    ).toEqual({ private: 2, teamspace: 1 });
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
