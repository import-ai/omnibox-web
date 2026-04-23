import { MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ResourceIcon from '@/assets/icons/resourceIcon';
import { Arrow } from '@/assets/icons/treeArrow';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { ResourceMeta } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  shareId: string;
  resource: ResourceMeta;
  isChatActive: boolean;
  showChat: boolean;
  isResourceActive: (resourceId: string) => boolean;
  onAddToContext: (resource: ResourceMeta, type: 'resource' | 'folder') => void;
  expandedFolders?: Set<string>;
  loadedChildren?: Record<string, ResourceMeta[]>;
  onToggleFolder?: (folderId: string) => void;
}

export default function SidebarItem(props: SidebarItemProps) {
  const {
    shareId,
    resource,
    isChatActive,
    showChat,
    isResourceActive,
    onAddToContext,
    expandedFolders = new Set(),
    loadedChildren = {},
    onToggleFolder,
  } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<ResourceMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const isActive = isResourceActive(resource.id);
  const hasChildren = !!resource.has_children;

  // Use external expandedFolders state if provided
  const isControlledExpanded = expandedFolders.has(resource.id);

  // Use pre-loaded children if available
  const displayChildren = loadedChildren[resource.id] || children;

  const fetchChildren = async () => {
    if (loading || loadedChildren[resource.id]) {
      return;
    }
    setLoading(true);
    try {
      const data = await http.get(
        `/shares/${shareId}/resources/${resource.id}/children`
      );
      setChildren(data || []);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (onToggleFolder) {
      onToggleFolder(resource.id);
    } else {
      // Fallback to local state
      if (!isExpanded && displayChildren.length === 0) {
        fetchChildren();
      }
      setIsExpanded(!isExpanded);
    }
  };

  // Fetch children when folder is expanded externally and no pre-loaded data
  useEffect(() => {
    if (
      isControlledExpanded &&
      displayChildren.length === 0 &&
      hasChildren &&
      !loadedChildren[resource.id]
    ) {
      fetchChildren();
    }
  }, [isControlledExpanded]);

  const handleClick = () => {
    navigate(`/s/${shareId}/${resource.id}`);
  };

  const handleAddToChat = () => {
    onAddToContext(resource, 'resource');
    if (!isChatActive) {
      navigate(`/s/${shareId}/chat`);
    }
  };

  const handleAddAllToChat = () => {
    onAddToContext(resource, 'folder');
    if (!isChatActive) {
      navigate(`/s/${shareId}/chat`);
    }
  };

  const handleContextMenuTrigger = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Trigger context menu by simulating right-click
    if (contextMenuRef.current) {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: e.clientX,
        clientY: e.clientY,
      });
      contextMenuRef.current.dispatchEvent(event);
    }
  };

  return (
    <SidebarMenuItem>
      <Collapsible open={isControlledExpanded || isExpanded}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className="group/sidebar-item my-px rounded-[6px] hover:bg-sidebar-accent"
              ref={contextMenuRef}
              data-resource-id={resource.id}
            >
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    asChild
                    className="h-auto gap-1 py-1.5 transition-none group-hover/sidebar-item:!pr-[30px] group-has-[[data-sidebar=menu-action]]/menu-item:pr-1 data-[active=true]:bg-[#E2E2E6] data-[active=true]:font-normal dark:data-[active=true]:bg-[#363637]"
                    isActive={isActive}
                  >
                    <div
                      className={cn('flex cursor-pointer items-center', {
                        'pl-1': hasChildren,
                        'pl-[28px]': !hasChildren,
                      })}
                      onClick={handleClick}
                    >
                      {hasChildren && (
                        <div
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggle();
                          }}
                          className="flex size-4 items-center justify-center"
                        >
                          {loading ? (
                            <Spinner className="size-3" />
                          ) : (
                            <Arrow
                              className={cn(
                                'text-neutral-400 transition-transform hover:text-accent-foreground',
                                (isControlledExpanded || isExpanded) &&
                                  'rotate-90'
                              )}
                            />
                          )}
                        </div>
                      )}

                      <ResourceIcon
                        expand={isControlledExpanded || isExpanded}
                        resource={resource}
                      />
                      <span className="flex-1 truncate text-sm">
                        {resource.name || t('untitled')}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className="max-w-xs break-all"
                >
                  {resource.name || t('untitled')}
                </TooltipContent>
              </Tooltip>
              {showChat && (
                <SidebarMenuAction
                  className="pointer-events-none right-2 size-4 cursor-pointer !text-neutral-400 opacity-0 hover:bg-transparent hover:!text-sidebar-foreground focus-visible:outline-none focus-visible:ring-transparent group-hover/sidebar-item:pointer-events-auto group-hover/sidebar-item:opacity-100 peer-data-[size=default]/menu-button:top-[8px]"
                  onClick={handleContextMenuTrigger}
                >
                  <MoreHorizontal />
                </SidebarMenuAction>
              )}
            </div>
          </ContextMenuTrigger>
          {showChat && (
            <ContextMenuContent>
              {hasChildren && (
                <ContextMenuItem
                  className="cursor-pointer"
                  onClick={handleAddAllToChat}
                >
                  {t('actions.add_all_to_context')}
                </ContextMenuItem>
              )}
              <ContextMenuItem
                className="cursor-pointer"
                onClick={handleAddToChat}
              >
                {t('actions.add_it_to_context')}
              </ContextMenuItem>
            </ContextMenuContent>
          )}
        </ContextMenu>
        {hasChildren && (
          <CollapsibleContent>
            <SidebarMenuSub className="mr-0 pl-2 pr-0">
              {displayChildren.map(child => (
                <SidebarItem
                  key={child.id}
                  shareId={shareId}
                  resource={child}
                  isResourceActive={isResourceActive}
                  isChatActive={isChatActive}
                  showChat={showChat}
                  onAddToContext={onAddToContext}
                  expandedFolders={expandedFolders}
                  loadedChildren={loadedChildren}
                  onToggleFolder={onToggleFolder}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </Collapsible>
    </SidebarMenuItem>
  );
}
