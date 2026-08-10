import type { SpaceType } from '@/interface';
import type { RssFolderLimits } from '@/page/sidebar/components/rss-folder';

export type RssFolderQuotaExhausted = Record<SpaceType, boolean>;

export function getRssFolderQuotaExhausted(
  limits?: RssFolderLimits
): RssFolderQuotaExhausted {
  if (!limits) {
    return { private: false, teamspace: false };
  }

  return {
    private:
      limits.folderPrivateLimit >= 0 &&
      limits.folderPrivateUsed >= limits.folderPrivateLimit,
    teamspace:
      limits.folderTeamLimit >= 0 &&
      limits.folderTeamUsed >= limits.folderTeamLimit,
  };
}

export function getRssFolderQuotaTooltipKey(
  hasTeamspace: boolean,
  exhausted: RssFolderQuotaExhausted,
  spaceType: SpaceType
): string | undefined {
  if (!exhausted[spaceType]) {
    return undefined;
  }
  if (!hasTeamspace) {
    return 'rss_folder.create.personal_quota_exhausted';
  }
  if (exhausted.private && exhausted.teamspace) {
    return 'rss_folder.create.all_quota_exhausted';
  }

  return spaceType === 'teamspace'
    ? 'rss_folder.create.team_quota_exhausted'
    : 'rss_folder.create.personal_quota_exhausted';
}
