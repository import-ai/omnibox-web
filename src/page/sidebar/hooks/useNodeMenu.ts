import {
  FilePlus,
  FolderPlus,
  LocateFixed,
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

import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';

import { useSidebarStore } from '../store';
import type { UseNodeActionsReturn } from './useNodeActions';

export type CreateFolderMode = 'direct' | 'dialog';

export type MenuItem = MenuActionItem | MenuSeparatorItem;

export interface MenuActionItem {
  key: string;
  icon: LucideIcon;
  label: string;
  separator?: false;
  destructive?: boolean;
  disabled?: boolean;
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
): {
  disabled: boolean;
  items: MenuItem[];
} {
  const { t } = useTranslation();
  const { node } = actions;
  const selectionMode = useSidebarStore(state => state.selectionMode);
  const selectedCount = useSidebarStore(
    state => Object.keys(state.selectedIds).length
  );

  return useMemo<{
    disabled: boolean;
    items: MenuItem[];
  }>(() => {
    if (!node) {
      return {
        disabled: false,
        items: [],
      };
    }

    if (selectionMode) {
      const disabled = selectedCount === 0;

      return {
        disabled,
        items: [
          {
            key: 'batch_create',
            icon: FolderPlus,
            label: t('batch.create_tooltip'),
            disabled,
          },
          { key: 'batch_1', separator: true },
          {
            key: 'batch_move',
            icon: Move,
            label: t('batch.move_tooltip'),
            disabled,
          },
          { key: 'batch_2', separator: true },
          {
            key: 'batch_add_to_chat',
            icon: MessageSquarePlus,
            label: t('batch.add_to_chat_tooltip'),
            disabled,
          },
          { key: 'batch_3', separator: true },
          {
            key: 'batch_delete',
            icon: Trash2,
            label: t('batch.delete_tooltip'),
            destructive: true,
            disabled,
          },
        ],
      };
    }

    if (isSmartFolderChildResource(node)) {
      return {
        disabled: false,
        items: [
          {
            key: 'locate_source_resource',
            icon: LocateFixed,
            label: t('actions.locate_source_resource'),
            onClick: actions.handleLocateSource,
          },
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
          { key: 'separator_1', separator: true },
          ...buildAddToChatItems(actions, t),
        ],
      };
    }

    if (node.resourceType === 'smart_folder') {
      return {
        disabled: false,
        items: [
          {
            key: 'rename',
            icon: SquarePen,
            label: t('actions.rename'),
            onSelect: onRename,
          },
          {
            key: 'edit',
            icon: Pencil,
            label: t('actions.edit_smart_folder_conditions'),
            onClick: actions.handleEdit,
          },
          { key: 'separator_1', separator: true },
          ...buildAddToChatItems(actions, t),
          { key: 'separator_2', separator: true },
          {
            key: 'delete',
            icon: Trash2,
            label: t('actions.move_to_trash'),
            destructive: true,
            onClick: actions.handleDelete,
          },
        ],
      };
    }

    return {
      disabled: false,
      items: [
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
      ],
    };
  }, [
    actions,
    t,
    createFolderMode,
    onRename,
    node,
    selectedCount,
    selectionMode,
  ]);
}

function buildAddToChatItems(
  actions: UseNodeActionsReturn,
  t: (key: string) => string
): MenuItem[] {
  const { node } = actions;

  if (!node) return [];

  if (node.resourceType === 'folder' || node.resourceType === 'smart_folder') {
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
