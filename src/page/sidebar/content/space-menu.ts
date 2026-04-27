import { IResourceData, SpaceType } from '@/interface';

import { SmartFolderEntitlements } from './smart-folder-types';

export type RootMenuSurface = 'context' | 'dropdown';

export type RootMenuAction =
  | 'create_file'
  | 'create_folder'
  | 'create_smart_folder'
  | 'upload_file';

export interface RootSmartFolderState {
  disabled: boolean;
  disabledMessageKey: string;
}

export const rootCreateMenuActions: RootMenuAction[] = [
  'create_file',
  'create_folder',
  'create_smart_folder',
  'upload_file',
];

const rootCreateMenuActionsBySurface: Record<
  SpaceType,
  Record<RootMenuSurface, RootMenuAction[]>
> = {
  private: {
    context: rootCreateMenuActions,
    dropdown: rootCreateMenuActions,
  },
  teamspace: {
    context: rootCreateMenuActions,
    dropdown: rootCreateMenuActions,
  },
};

export function getRootCreateMenuActions(
  spaceType: SpaceType,
  surface: RootMenuSurface
): RootMenuAction[] {
  return rootCreateMenuActionsBySurface[spaceType][surface];
}

export function getRootSmartFolderState(
  spaceType: SpaceType,
  children: IResourceData[] | undefined,
  entitlements: SmartFolderEntitlements | undefined
): RootSmartFolderState {
  const smartFolderCount =
    children?.filter(item => item.resource_type === 'smart_folder').length ?? 0;
  const limit =
    spaceType === 'private'
      ? (entitlements?.privateLimit ?? 1)
      : (entitlements?.teamLimit ?? 1);

  return {
    disabled:
      typeof limit === 'number' && limit >= 0 && smartFolderCount >= limit,
    disabledMessageKey:
      spaceType === 'private'
        ? 'smart_folder.create.personal_quota_exhausted'
        : 'smart_folder.create.team_quota_exhausted',
  };
}

export function shouldOpenCreateSmartFolderDialog(disabled: boolean): boolean {
  return !disabled;
}

export function stopRootContextMenuPropagation(
  event: Pick<React.MouseEvent, 'stopPropagation'>
) {
  event.stopPropagation();
}
