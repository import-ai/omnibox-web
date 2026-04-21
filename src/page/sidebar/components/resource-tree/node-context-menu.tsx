import {
  FilePlus,
  FolderPlus,
  MessageSquarePlus,
  MessageSquareQuote,
  MonitorUp,
  Move,
  Pencil,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDragLayer } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import MoveTo from '@/page/resource/actions/move';

import { useNodeActions } from './hooks/use-node-actions';
import { menuIconClass, menuItemClass } from './node-styles';

interface NodeContextMenuProps {
  nodeId: string;
  namespaceId: string;
  children: React.ReactNode;
}

export default function NodeContextMenu({
  nodeId,
  namespaceId,
  children,
}: NodeContextMenuProps) {
  const { t } = useTranslation();
  const [contextOpen, setContextOpen] = useState(false);

  const { isActuallyDragging } = useDragLayer(monitor => {
    const isDragging = monitor.isDragging();
    const diff = monitor.getDifferenceFromInitialOffset();
    const hasMoved = diff
      ? Math.abs(diff.x) > 5 || Math.abs(diff.y) > 5
      : false;
    return {
      isActuallyDragging: isDragging && hasMoved,
    };
  });

  useEffect(() => {
    if (isActuallyDragging && contextOpen) {
      setContextOpen(false);
    }
  }, [isActuallyDragging, contextOpen]);

  const actions = useNodeActions(nodeId, namespaceId);
  const { node } = actions;

  if (!node) return children;

  return (
    <>
      <ContextMenu open={contextOpen} onOpenChange={setContextOpen}>
        <ContextMenuTrigger disabled={isActuallyDragging}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className={menuItemClass}
            onClick={actions.handleCreateFile}
          >
            <FilePlus className={menuIconClass} />
            {t('actions.create_file')}
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            onClick={actions.handleCreateFolderDirect}
          >
            <FolderPlus className={menuIconClass} />
            {t('actions.create_folder')}
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            onClick={() => actions.fileInputRef.current?.click()}
          >
            <MonitorUp className={menuIconClass} />
            {t('actions.upload_file')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className={menuItemClass}
            onClick={actions.handleRename}
          >
            <SquarePen className={menuIconClass} />
            {t('actions.rename')}
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            onClick={actions.handleEdit}
          >
            <Pencil className={menuIconClass} />
            {t('edit')}
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            onClick={actions.handleMoveTo}
          >
            <Move className={menuIconClass} />
            {t('actions.move_to')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          {node.resourceType === 'folder' ? (
            <ContextMenuItem
              className={menuItemClass}
              onClick={actions.handleAddAllToChat}
            >
              <MessageSquarePlus className={menuIconClass} />
              {t('actions.add_all_to_context')}
            </ContextMenuItem>
          ) : node.hasChildren ? (
            <>
              <ContextMenuItem
                className={menuItemClass}
                onClick={actions.handleAddAllToChat}
              >
                <MessageSquarePlus className={menuIconClass} />
                {t('actions.add_all_to_context')}
              </ContextMenuItem>
              <ContextMenuItem
                className={menuItemClass}
                onClick={actions.handleAddToChat}
              >
                <MessageSquareQuote className={menuIconClass} />
                {t('actions.add_it_to_context')}
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem
              className={menuItemClass}
              onClick={actions.handleAddToChat}
            >
              <MessageSquareQuote className={menuIconClass} />
              {t('actions.add_it_to_context')}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem
            className="group cursor-pointer gap-2 data-[highlighted]:text-destructive"
            onClick={actions.handleDelete}
          >
            <Trash2 className="size-4 text-neutral-500 dark:text-[#a1a1a1] group-hover:text-destructive" />
            {t('actions.move_to_trash')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <MoveTo
        open={actions.moveTo}
        resourceId={nodeId}
        onOpenChange={actions.setMoveTo}
        namespaceId={namespaceId}
        onFinished={actions.handleMoveFinished}
      />
      <Input
        multiple
        type="file"
        ref={actions.fileInputRef}
        className="hidden"
        onChange={actions.handleUpload}
        accept={ALLOW_FILE_EXTENSIONS}
      />
    </>
  );
}
