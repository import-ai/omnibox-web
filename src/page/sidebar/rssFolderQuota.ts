import type { SpaceType } from '@/interface';
import type { RssFolderLimits } from '@/page/sidebar/components/rss-folder';

export type RssFolderQuotaExhausted = Record<SpaceType, boolean>;

export type RssFolderSpaceCounts = Record<SpaceType, number>;

// Count loaded sidebar nodes so create/delete can update the menu before the
// limits API refetch lands. Callers should Math.max this with API used counts.
export function countRssFoldersBySpace(
  nodes: Record<string, { resourceType: string; spaceType: SpaceType }>
): RssFolderSpaceCounts {
  const counts: RssFolderSpaceCounts = { private: 0, teamspace: 0 };
  for (const node of Object.values(nodes)) {
    if (node.resourceType === 'rss_folder') {
      counts[node.spaceType] += 1;
    }
  }
  return counts;
}

export function getRssFolderQuotaExhausted(
  limits?: RssFolderLimits,
  localCounts?: RssFolderSpaceCounts
): RssFolderQuotaExhausted {
  if (!limits) {
    return { private: false, teamspace: false };
  }

  // Prefer the higher of API used vs loaded tree so a just-created folder
  // disables the menu immediately even if the limits cache is still stale.
  const privateUsed = Math.max(
    limits.folderPrivateUsed,
    localCounts?.private ?? 0
  );
  const teamUsed = Math.max(limits.folderTeamUsed, localCounts?.teamspace ?? 0);

  return {
    private:
      limits.folderPrivateLimit >= 0 &&
      privateUsed >= limits.folderPrivateLimit,
    teamspace:
      limits.folderTeamLimit >= 0 && teamUsed >= limits.folderTeamLimit,
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
