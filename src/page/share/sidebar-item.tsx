import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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
import ResourceIcon from '@/page/sidebar/content/resourceIcon';

interface SidebarItemProps {
  shareId: string;
  resource: ResourceMeta;
  isChatActive: boolean;
  showChat: boolean;
  isResourceActive: (resourceId: string) => boolean;
  onAddToContext: (resource: ResourceMeta, type: 'resource' | 'folder') => void;
}

export default function SidebarItem(props: SidebarItemProps) {
  const {
    shareId,
    resource,
    isChatActive,
    showChat,
    isResourceActive,
    onAddToContext,
  } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<ResourceMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const isActive = isResourceActive(resource.id);
  const hasChildren = !!resource.has_children;

  const fetchChildren = async () => {
    if (loading) {
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
    if (!isExpanded && children.length === 0) {
      fetchChildren();
    }
    setIsExpanded(!isExpanded);
  };

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
      <Collapsible open={isExpanded}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className="group/sidebar-item my-[1px] rounded-[6px] hover:bg-sidebar-accent"
              ref={contextMenuRef}
            >
              <SidebarMenuButton
                asChild
                className="gap-1 py-1.5 h-auto data-[active=true]:font-normal group-has-[[data-sidebar=menu-action]]/menu-item:pr-1 group-hover/sidebar-item:!pr-[30px] data-[active=true]:bg-[#E2E2E6] dark:data-[active=true]:bg-[#363637] transition-none"
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
                      className="flex items-center justify-center w-4 h-4"
                    >
                      {loading ? (
                        <Spinner className="w-3 h-3" />
                      ) : (
                        <ChevronRight
                          className={cn(
                            'w-3 h-3 transition-transform',
                            isExpanded && 'rotate-90'
                          )}
                        />
                      )}
                    </div>
                  )}

                  <ResourceIcon expand={isExpanded} resource={resource} />
                  <span className="truncate flex-1 text-sm">
                    {resource.name || t('untitled')}
                  </span>
                </div>
              </SidebarMenuButton>
              {showChat && (
                <SidebarMenuAction
                  className="group-hover/sidebar-item:opacity-100 opacity-0 group-hover/sidebar-item:pointer-events-auto pointer-events-none size-4 right-2 !text-neutral-400 hover:!text-sidebar-foreground hover:bg-transparent focus-visible:outline-none focus-visible:ring-transparent cursor-pointer"
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
            <SidebarMenuSub className="pr-0 mr-0 pl-2">
              {children.map(child => (
                <SidebarItem
                  key={child.id}
                  shareId={shareId}
                  resource={child}
                  isResourceActive={isResourceActive}
                  isChatActive={isChatActive}
                  showChat={showChat}
                  onAddToContext={onAddToContext}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </Collapsible>
    </SidebarMenuItem>
  );
}
