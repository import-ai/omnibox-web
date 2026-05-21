import { ArrowUpDown, LocateFixed, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

export function useToolConfig(
  disabledMap: ResourceTreeToolDisabledMap = {}
): ResourceTreeToolItem[] {
  const { t } = useTranslation();

  return [
    {
      id: 'one-click-location',
      name: t('tool.positioning'),
      icon: LocateFixed,
      hoverTip: t('tool.positioning'),
      disabled: disabledMap['one-click-location'],
      disabledTip: t('tool.positioning'),
      onClick: () => {
        console.log('one-click-location');
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
