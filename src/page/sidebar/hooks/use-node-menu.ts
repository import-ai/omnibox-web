import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { UseNodeActionsReturn } from '../hooks/use-node-actions';

export type CreateFolderMode = 'direct' | 'dialog';

export interface MenuItem {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  separator?: boolean;
  destructive?: boolean;
  onClick?: () => void;
  onSelect?: () => void;
}

export function useNodeMenu(
  actions: UseNodeActionsReturn,
  createFolderMode: CreateFolderMode = 'dialog',
  onRename?: () => void
): MenuItem[] {
  const { t } = useTranslation();
  const { node } = actions;

  return useMemo(() => {
    if (!node) return [];

    return [
      {
        key: 'create_file',
        icon: require('lucide-react').FilePlus,
        label: t('actions.create_file'),
        onClick: actions.handleCreateFile,
      },
      {
        key: 'create_folder',
        icon: require('lucide-react').FolderPlus,
        label: t('actions.create_folder'),
        onClick:
          createFolderMode === 'direct'
            ? actions.handleCreateFolderDirect
            : actions.handleCreateFolderWithDialog,
      },
      {
        key: 'upload_file',
        icon: require('lucide-react').MonitorUp,
        label: t('actions.upload_file'),
        onClick: () => actions.fileInputRef.current?.click(),
      },
      { key: 'separator_1', separator: true },
      {
        key: 'rename',
        icon: require('lucide-react').SquarePen,
        label: t('actions.rename'),
        onSelect: onRename,
      },
      {
        key: 'edit',
        icon: require('lucide-react').Pencil,
        label: t('edit'),
        onClick: actions.handleEdit,
      },
      {
        key: 'move_to',
        icon: require('lucide-react').Move,
        label: t('actions.move_to'),
        onClick: actions.handleMoveTo,
      },
      { key: 'separator_2', separator: true },
      ...buildAddToChatItems(actions, t),
      { key: 'separator_3', separator: true },
      {
        key: 'delete',
        icon: require('lucide-react').Trash2,
        label: t('actions.move_to_trash'),
        destructive: true,
        onClick: actions.handleDelete,
      },
    ];
  }, [actions, t, createFolderMode, onRename, node]);
}

function buildAddToChatItems(
  actions: UseNodeActionsReturn,
  t: (key: string) => string
): MenuItem[] {
  const { node } = actions;

  if (!node) return [];

  const icons = require('lucide-react');

  if (node.resourceType === 'folder') {
    return [
      {
        key: 'add_all_to_context',
        icon: icons.MessageSquarePlus,
        label: t('actions.add_all_to_context'),
        onClick: actions.handleAddAllToChat,
      },
    ];
  }

  if (node.hasChildren) {
    return [
      {
        key: 'add_all_to_context',
        icon: icons.MessageSquarePlus,
        label: t('actions.add_all_to_context'),
        onClick: actions.handleAddAllToChat,
      },
      {
        key: 'add_it_to_context',
        icon: icons.MessageSquareQuote,
        label: t('actions.add_it_to_context'),
        onClick: actions.handleAddToChat,
      },
    ];
  }

  return [
    {
      key: 'add_it_to_context',
      icon: icons.MessageSquareQuote,
      label: t('actions.add_it_to_context'),
      onClick: actions.handleAddToChat,
    },
  ];
}
