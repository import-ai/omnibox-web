import {
  FilePlus,
  FolderPlus,
  type LucideIcon,
  MessageSquarePlus,
  MessageSquareQuote,
  MonitorUp,
  Move,
  Pencil,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { UseNodeActionsReturn } from '../hooks/use-node-actions';

export type CreateFolderMode = 'direct' | 'dialog';

export type MenuItem = MenuActionItem | MenuSeparatorItem;

export interface MenuActionItem {
  key: string;
  icon: LucideIcon;
  label: string;
  separator?: false;
  destructive?: boolean;
  onClick?: () => void;
  onSelect?: () => void;
}

export interface MenuSeparatorItem {
  key: string;
  separator: true;
}

export function useNodeMenu(
  actions: UseNodeActionsReturn,
  createFolderMode: CreateFolderMode = 'dialog',
  onRename?: () => void
): MenuItem[] {
  const { t } = useTranslation();
  const { node } = actions;

  const menuItems = useMemo<MenuItem[]>(() => {
    if (!node) return [];

    return [
      {
        key: 'create_file',
        icon: FilePlus,
        label: t('actions.create_file'),
        onClick: actions.handleCreateFile,
      },
      {
        key: 'create_folder',
        icon: FolderPlus,
        label: t('actions.create_folder'),
        onClick:
          createFolderMode === 'direct'
            ? actions.handleCreateFolderDirect
            : actions.handleCreateFolderWithDialog,
      },
      {
        key: 'upload_file',
        icon: MonitorUp,
        label: t('actions.upload_file'),
        onClick: actions.handleUpload,
      },
      { key: 'separator_1', separator: true },
      {
        key: 'rename',
        icon: SquarePen,
        label: t('actions.rename'),
        onSelect: onRename,
      },
      {
        key: 'edit',
        icon: Pencil,
        label: t('edit'),
        onClick: actions.handleEdit,
      },
      {
        key: 'move_to',
        icon: Move,
        label: t('actions.move_to'),
        onClick: actions.handleMoveTo,
      },
      { key: 'separator_2', separator: true },
      ...buildAddToChatItems(actions, t),
      { key: 'separator_3', separator: true },
      {
        key: 'delete',
        icon: Trash2,
        label: t('actions.move_to_trash'),
        destructive: true,
        onClick: actions.handleDelete,
      },
    ];
  }, [actions, t, createFolderMode, onRename, node]);

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
