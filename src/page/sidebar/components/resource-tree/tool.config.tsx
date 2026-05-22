import { ArrowUpDown, LocateFixed, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSidebarStore } from '@/page/sidebar/store';
import { scrollToSidebarResource } from '@/page/sidebar/utils';

export type ResourceTreeToolId = 'one-click-location' | 'sort';

export type ResourceTreeToolDisabledMap = Partial<
  Record<ResourceTreeToolId, boolean>
>;

export interface ResourceTreeToolItem {
  id: ResourceTreeToolId;
  name: string;
  icon: LucideIcon;
  hoverTip: string;
  disabled?: boolean;
  disabledTip?: string;
  destructive?: boolean;
  onClick: () => void;
}

interface UseToolConfigOptions {
  currentResourceId?: string;
  disabledMap?: ResourceTreeToolDisabledMap;
}

export function useToolConfig({
  currentResourceId,
  disabledMap = {},
}: UseToolConfigOptions = {}): ResourceTreeToolItem[] {
  const { t } = useTranslation();

  return [
    {
      id: 'one-click-location',
      name: t('tool.positioning'),
      icon: LocateFixed,
      hoverTip: t('tool.positioning'),
      disabled: disabledMap['one-click-location'],
      disabledTip: t('tool.positioning_disabled'),
      onClick: async () => {
        const targetId =
          currentResourceId || useSidebarStore.getState().activeId;
        if (!targetId) return;

        await useSidebarStore
          .getState()
          .expandPathTo(targetId, { expandTarget: true });
        scrollToSidebarResource(targetId);
      },
    },
    {
      id: 'sort',
      name: t('tool.sort'),
      icon: ArrowUpDown,
      hoverTip: t('tool.sort'),
      disabled: disabledMap.sort,
      onClick: () => {
        console.log('sort');
      },
    },
  ];
}
