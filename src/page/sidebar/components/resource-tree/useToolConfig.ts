import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';

import { SmartFolderDefaultIcon } from '@/assets/icons/smartFolderDefault';

import type { SmartFolderEntitlements } from '../../content/smart-folder-types';

export type ResourceTreeToolId = 'create-smart-folder';

export interface ResourceTreeToolCounts {
  privateCount: number;
  teamCount: number;
  hasTeamspace: boolean;
}

export interface ResourceTreeToolItem {
  id: ResourceTreeToolId;
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  hoverTip: string;
  disabled?: boolean;
  disabledTip?: string;
  onClick: () => void;
}

function getCreateSmartFolderDisabledState(
  entitlements: SmartFolderEntitlements | undefined,
  counts: ResourceTreeToolCounts
) {
  if (!entitlements) {
    return {
      disabled: false,
      disabledMessageKey: 'actions.create_smart_folder',
    };
  }

  const privateLimit = entitlements.privateLimit ?? 1;
  const teamLimit = entitlements.teamLimit ?? 1;
  const privateExhausted =
    privateLimit >= 0 && counts.privateCount >= privateLimit;
  const teamExhausted = teamLimit >= 0 && counts.teamCount >= teamLimit;

  return {
    disabled: counts.hasTeamspace
      ? privateExhausted && teamExhausted
      : privateExhausted,
    disabledMessageKey: counts.hasTeamspace
      ? 'smart_folder.create.all_quota_exhausted'
      : 'smart_folder.create.quota_exhausted',
  };
}

export function useToolConfig(options: {
  entitlements: SmartFolderEntitlements | undefined;
  counts: ResourceTreeToolCounts;
  onCreateSmartFolder: () => void;
}): ResourceTreeToolItem[] {
  const { t } = useTranslation();
  const createSmartFolderState = getCreateSmartFolderDisabledState(
    options.entitlements,
    options.counts
  );

  return [
    {
      id: 'create-smart-folder',
      name: t('actions.create_smart_folder'),
      icon: SmartFolderDefaultIcon,
      hoverTip: t('actions.create_smart_folder'),
      disabled: createSmartFolderState.disabled,
      disabledTip: t(createSmartFolderState.disabledMessageKey),
      onClick: options.onCreateSmartFolder,
    },
  ];
}
