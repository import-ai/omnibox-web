import { MessageSquarePlus, MessageSquareQuote } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { UseNodeActionsReturn } from '../hooks/use-node-actions';

export type CreateFolderMode = 'direct' | 'dialog';

export interface MenuItem {
  key: string;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  separator?: boolean;
  destructive?: boolean;
  onClick?: () => void;
  onSelect?: () => void;
}

export function useNodeMenu(actions: UseNodeActionsReturn): MenuItem[] {
  const { t } = useTranslation();
  const { node } = actions;

  const menuItems = useMemo(() => {
    if (!node) return [];
    return buildAddToChatItems(actions, t);
  }, [actions, t, node]);

  return menuItems;
}

function buildAddToChatItems(
  actions: UseNodeActionsReturn,
  t: (key: string) => string
): MenuItem[] {
  const { node } = actions;

  if (!node) return [];

  if (node.resourceType === 'folder') {
    return [
      {
        key: 'add_all_to_context',
        icon: MessageSquarePlus,
        label: t('actions.add_all_to_context'),
        onClick: actions.handleAddAllToChat,
      },
    ];
  }

  if (node.hasChildren) {
    return [
      {
        key: 'add_all_to_context',
        icon: MessageSquarePlus,
        label: t('actions.add_all_to_context'),
        onClick: actions.handleAddAllToChat,
      },
      {
        key: 'add_it_to_context',
        icon: MessageSquareQuote,
        label: t('actions.add_it_to_context'),
        onClick: actions.handleAddToChat,
      },
    ];
  }

  return [
    {
      key: 'add_it_to_context',
      icon: MessageSquareQuote,
      label: t('actions.add_it_to_context'),
      onClick: actions.handleAddToChat,
    },
  ];
}
