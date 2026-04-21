import {
  FilePlus,
  FolderPlus,
  MessageSquarePlus,
  MessageSquareQuote,
  MonitorUp,
  MoreHorizontal,
  Move,
  Pencil,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { useIsTouch } from '@/hooks/use-is-touch';
import { cn } from '@/lib/utils';
import MoveTo from '@/page/resource/actions/move';

import { CreateFolderDialog } from './create-folder-dialog';
import { useNodeActions } from './hooks/use-node-actions';
import { menuIconClass, menuItemClass } from './node-styles';

interface NodeActionsProps {
  nodeId: string;
  namespaceId: string;
  isUploading?: boolean;
  uploadProgress?: string;
}

export default function NodeActions({
  nodeId,
  namespaceId,
  isUploading,
  uploadProgress,
}: NodeActionsProps) {
  const { t } = useTranslation();
  const isTouch = useIsTouch();
  const [menuOpen, setMenuOpen] = useState(false);

  const actions = useNodeActions(nodeId, namespaceId);
  const { node } = actions;

  if (!node) return null;

  const handleRename = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    actions.handleRename();
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          {isUploading ? (
            <>
              {uploadProgress ? (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <SidebarMenuAction className="group-hover/sidebar-item:pointer-events-auto pointer-events-none size-[16px] peer-data-[size=default]/menu-button:top-[8px] right-2 focus-visible:outline-none focus-visible:ring-transparent">
                        <Spinner />
                      </SidebarMenuAction>
                    </TooltipTrigger>
                    <TooltipContent>{uploadProgress}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <SidebarMenuAction className="group-hover/sidebar-item:pointer-events-auto pointer-events-none size-[16px] peer-data-[size=default]/menu-button:top-[8px] right-2 focus-visible:outline-none focus-visible:ring-transparent">
                  <Spinner />
                </SidebarMenuAction>
              )}
            </>
          ) : (
            <SidebarMenuAction
              asChild
              className={cn(
                'size-4 peer-data-[size=default]/menu-button:top-2 right-2 !text-neutral-400 hover:!text-sidebar-foreground hover:bg-transparent focus-visible:outline-none focus-visible:ring-transparent cursor-pointer',
                isTouch
                  ? 'opacity-100 pointer-events-auto'
                  : 'group-hover/sidebar-item:opacity-100 group-hover/sidebar-item:pointer-events-auto pointer-events-none opacity-0'
              )}
            >
              <MoreHorizontal className="focus-visible:outline-none focus-visible:ring-transparent cursor-pointer" />
            </SidebarMenuAction>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={10}>
          <DropdownMenuItem
            className={menuItemClass}
            onClick={actions.handleCreateFile}
          >
            <FilePlus className={menuIconClass} />
            {t('actions.create_file')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={menuItemClass}
            onClick={actions.handleCreateFolderWithDialog}
          >
            <FolderPlus className={menuIconClass} />
            {t('actions.create_folder')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={menuItemClass}
            onClick={() => actions.fileInputRef.current?.click()}
          >
            <MonitorUp className={menuIconClass} />
            {t('actions.upload_file')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={menuItemClass} onSelect={handleRename}>
            <SquarePen className={menuIconClass} />
            {t('actions.rename')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={menuItemClass}
            onClick={actions.handleEdit}
          >
            <Pencil className={menuIconClass} />
            {t('edit')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={menuItemClass}
            onClick={actions.handleMoveTo}
          >
            <Move className={menuIconClass} />
            {t('actions.move_to')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {node.resourceType === 'folder' ? (
            <DropdownMenuItem
              className={menuItemClass}
              onClick={actions.handleAddAllToChat}
            >
              <MessageSquarePlus className={menuIconClass} />
              {t('actions.add_all_to_context')}
            </DropdownMenuItem>
          ) : node.hasChildren ? (
            <>
              <DropdownMenuItem
                className={menuItemClass}
                onClick={actions.handleAddAllToChat}
              >
                <MessageSquarePlus className={menuIconClass} />
                {t('actions.add_all_to_context')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemClass}
                onClick={actions.handleAddToChat}
              >
                <MessageSquareQuote className={menuIconClass} />
                {t('actions.add_it_to_context')}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              className={menuItemClass}
              onClick={actions.handleAddToChat}
            >
              <MessageSquareQuote className={menuIconClass} />
              {t('actions.add_it_to_context')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="group cursor-pointer gap-2 data-[highlighted]:text-destructive"
            onClick={actions.handleDelete}
          >
            <Trash2 className="size-4 text-neutral-500 dark:text-[#a1a1a1] group-hover:text-destructive" />
            {t('actions.move_to_trash')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MoveTo
        open={actions.moveTo}
        resourceId={nodeId}
        onOpenChange={actions.setMoveTo}
        namespaceId={namespaceId}
        onFinished={actions.handleMoveFinished}
      />
      <CreateFolderDialog
        open={actions.createFolderOpen}
        onOpenChange={actions.setCreateFolderOpen}
        onConfirm={actions.handleConfirmCreateFolder}
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
