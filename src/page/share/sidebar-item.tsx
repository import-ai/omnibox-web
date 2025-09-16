import { ChevronRight, LoaderCircle, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar';
import useApp from '@/hooks/use-app';
import { ResourceMeta } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  shareId: string;
  resource: ResourceMeta;
  isChatActive: boolean;
  hasChildren: boolean;
  isResourceActive: (resourceId: string) => boolean;
}

export default function SidebarItem(props: SidebarItemProps) {
  const { shareId, resource, isChatActive, hasChildren, isResourceActive } =
    props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const app = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<ResourceMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const isActive = isResourceActive(resource.id);

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
    if (!isChatActive) {
      navigate(`/s/${shareId}/chat`);
      setTimeout(() => {
        app.fire('context', resource, 'resource');
      }, 100);
    } else {
      app.fire('context', resource, 'resource');
    }
  };

  const handleAddAllToChat = () => {
    if (!isChatActive) {
      navigate(`/s/${shareId}/chat`);
      setTimeout(() => {
        app.fire('context', resource, 'folder');
      }, 100);
    } else {
      app.fire('context', resource, 'folder');
    }
  };

  return (
    <SidebarMenuItem>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {hasChildren ? (
            <Collapsible open={isExpanded}>
              <CollapsibleTrigger asChild>
                <div>
                  <SidebarMenuButton
                    asChild
                    className="gap-1 py-2 h-auto"
                    isActive={isActive}
                  >
                    <div
                      className="flex cursor-pointer items-center"
                      onClick={handleClick}
                    >
                      <div
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggle();
                        }}
                        className="flex items-center justify-center w-4 h-4"
                      >
                        {loading ? (
                          <LoaderCircle className="w-3 h-3 animate-spin" />
                        ) : (
                          <ChevronRight
                            className={cn(
                              'w-3 h-3 transition-transform',
                              isExpanded && 'rotate-90'
                            )}
                          />
                        )}
                      </div>
                      <span className="truncate ml-1">
                        {resource.name || t('untitled')}
                      </span>
                    </div>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction>
                        <MoreHorizontal className="w-4 h-4" />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="right"
                      align="start"
                      sideOffset={10}
                    >
                      {resource.resource_type === 'folder' && (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={handleAddAllToChat}
                        >
                          {t('actions.add_all_to_context')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={handleAddToChat}
                      >
                        {t('actions.add_it_to_context')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="pr-0 mr-0 pl-2">
                  {children.map(child => (
                    <SidebarItem
                      key={child.id}
                      shareId={shareId}
                      resource={child}
                      isResourceActive={isResourceActive}
                      isChatActive={isChatActive}
                      hasChildren={!!child.has_children}
                    />
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div>
              <SidebarMenuButton
                asChild
                className="gap-1 py-2 h-auto"
                isActive={isActive}
              >
                <div
                  className="flex cursor-pointer items-center"
                  onClick={handleClick}
                >
                  <div className="w-4 h-4" />
                  <span className="truncate ml-1">
                    {resource.name || t('untitled')}
                  </span>
                </div>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction>
                    <MoreHorizontal className="w-4 h-4" />
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" sideOffset={10}>
                  {resource.resource_type === 'folder' && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={handleAddAllToChat}
                    >
                      {t('actions.add_all_to_context')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleAddToChat}
                  >
                    {t('actions.add_it_to_context')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {resource.resource_type === 'folder' && (
            <ContextMenuItem
              className="cursor-pointer"
              onClick={handleAddAllToChat}
            >
              {t('actions.add_all_to_context')}
            </ContextMenuItem>
          )}
          <ContextMenuItem className="cursor-pointer" onClick={handleAddToChat}>
            {t('actions.add_it_to_context')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </SidebarMenuItem>
  );
}
