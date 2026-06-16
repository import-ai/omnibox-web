import {
  Crosshair,
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

import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';

import { useSidebarStore } from '../store';
import { getBatchSelectionSummary } from '../store/utils';
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
  disabledTip?: string;
  onClick?: () => void;
  onSelect?: () => void;
}

export interface BatchMenuActions {
  onCreate: () => void;
  onMove: () => void;
  onAddToChat: () => void;
  onDelete: () => void;
}

export interface MenuSeparatorItem {
  key: string;
  separator: true;
}

export function useNodeMenu(
  actions: UseNodeActionsReturn,
  createFolderMode: CreateFolderMode = 'dialog',
  onRename?: () => void,
  batchActions?: BatchMenuActions
): {
  disabled: boolean;
  disabledTip?: string;
  items: MenuItem[];
} {
  const { t } = useTranslation();
  const { node } = actions;
  const selectionMode = useSidebarStore(state => state.selectionMode);
  const selectedIds = useSidebarStore(state => state.selectedIds);
  const nodes = useSidebarStore(state => state.nodes);

  return useMemo<{
    disabled: boolean;
    disabledTip?: string;
    items: MenuItem[];
  }>(() => {
    if (!node) {
      return {
        disabled: false,
        items: [],
      };
    }

    if (selectionMode) {
      const batchSelection = getBatchSelectionSummary(nodes, selectedIds);
      const disabled = batchSelection.selectedCount === 0;
      const smartFolderUnsupported = batchSelection.hasSmartFolder;
      const smartFolderUnsupportedTip = t(
        'batch.smart_folder_unsupported_action'
      );
      const disabledTip = disabled ? t('batch.select_required') : undefined;
      const smartFolderDisabledTip = smartFolderUnsupported
        ? smartFolderUnsupportedTip
        : disabledTip;

      return {
        disabled,
        disabledTip,
        items: [
          {
            key: 'batch_create',
            icon: FolderPlus,
            label: t('batch.create_tooltip'),
            disabled: disabled || smartFolderUnsupported,
            disabledTip: disabled ? undefined : smartFolderDisabledTip,
            onClick: batchActions?.onCreate,
          },
          { key: 'batch_1', separator: true },
          {
            key: 'batch_move',
            icon: Move,
            label: t('batch.move_tooltip'),
            disabled: disabled || smartFolderUnsupported,
            disabledTip: disabled ? undefined : smartFolderDisabledTip,
            onClick: batchActions?.onMove,
          },
          { key: 'batch_2', separator: true },
          {
            key: 'batch_add_to_chat',
            icon: MessageSquarePlus,
            label: t('batch.add_to_chat_tooltip'),
            disabled,
            onClick: batchActions?.onAddToChat,
          },
          { key: 'batch_3', separator: true },
          {
            key: 'batch_delete',
            icon: Trash2,
            label: t('batch.delete_tooltip'),
            destructive: true,
            disabled,
            onClick: batchActions?.onDelete,
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
            icon: Crosshair,
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
    nodes,
    selectedIds,
    selectionMode,
    batchActions,
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
