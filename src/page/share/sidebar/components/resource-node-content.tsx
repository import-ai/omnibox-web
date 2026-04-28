import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ResourceIcon from '@/assets/icons/resourceIcon';
import { Arrow } from '@/assets/icons/treeArrow';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebar,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { TreeNode } from '@/page/share/sidebar/store';
import { useSidebarStore } from '@/page/share/sidebar/store';

import Action from './node-actions';
import ContextMenuMain from './node-context-menu';
import ResourceNode from './resource-node';
import { ResourceTreeProps } from './resource-node';

interface ResourceNodeContentProps extends ResourceTreeProps {
  node: TreeNode;
  nodeId: string;
}

export function ResourceNodeContent({
  node,
  nodeId,
  shareId,
  showChat,
  isChatActive,
  isResourceActive,
  onAddToContext,
}: ResourceNodeContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  const nodeUI = useSidebarStore(s => s.ui[nodeId]);
  const activeId = useSidebarStore(s => s.activeId);
  const isActive = isResourceActive(nodeId) || nodeId === activeId;

  const handleNavigate = (id: string, edit?: boolean) => {
    if (edit) {
      navigate(`/s/${shareId}/${id}`, { state: { fromSidebar: true } });
    } else if (id === 'chat') {
      navigate(`/s/${shareId}/chat`);
    } else {
      navigate(`/s/${shareId}/${id}`, { state: { fromSidebar: true } });
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleExpand = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (nodeUI?.expanded) {
      useSidebarStore.getState().collapse(nodeId);
    } else {
      useSidebarStore.getState().expand(nodeId);
    }
  };

  const handleActive = () => {
    if (node.hasChildren) {
      if (isActive) {
        handleExpand();
      } else {
        handleNavigate(nodeId);
        useSidebarStore.getState().activate(nodeId);
        if (!nodeUI?.expanded) {
          useSidebarStore.getState().expand(nodeId);
        }
      }
    } else {
      handleNavigate(nodeId);
      useSidebarStore.getState().activate(nodeId);
    }
  };

  return (
    <SidebarMenuItem>
      <Collapsible
        open={nodeUI?.expanded}
        className={cn('group/collapsible', {
          '[&[data-state=open]>span>div>div>button>svg:first-child]:rotate-90':
            nodeUI?.expanded && !nodeUI?.loading && node.hasChildren,
        })}
      >
        <CollapsibleTrigger asChild>
          <ContextMenuMain
            nodeId={nodeId}
            shareId={shareId}
            showChat={showChat}
            isChatActive={isChatActive}
            onAddToContext={onAddToContext}
          >
            <div className="group/sidebar-item my-px rounded-md hover:bg-sidebar-accent">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    asChild
                    className="h-auto gap-1 py-1.5 transition-none group-hover/sidebar-item:!pr-[30px] group-has-[[data-sidebar=menu-action]]/menu-item:pr-1 data-[active=true]:bg-[#E2E2E6] data-[active=true]:font-normal dark:data-[active=true]:bg-[#363637]"
                    onClick={handleActive}
                    isActive={isActive}
                  >
                    <div
                      data-resource-id={nodeId}
                      className={cn('list flex cursor-pointer', {
                        'pl-1': node.hasChildren,
                        'pl-7': !node.hasChildren,
                      })}
                    >
                      {node.hasChildren &&
                        (nodeUI?.loading ? (
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-5 border-none bg-transparent shadow-none hover:bg-transparent"
                          >
                            <Spinner />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-5 border-none bg-transparent text-neutral-400 shadow-none hover:bg-transparent"
                            onClick={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleExpand();
                            }}
                          >
                            <Arrow className="transition-transform" />
                          </Button>
                        ))}
                      <ResourceIcon
                        expand={nodeUI?.expanded}
                        resource={{
                          id: node.id,
                          name: node.name,
                          parent_id: node.parentId,
                          resource_type: node.resourceType,
                          has_children: node.hasChildren,
                          attrs: node.attrs,
                        }}
                      />
                      <span className="flex-1 truncate">
                        {node.name || t('untitled')}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className="max-w-xs break-all"
                >
                  {node.name || t('untitled')}
                </TooltipContent>
              </Tooltip>
              {showChat && (
                <Action
                  nodeId={nodeId}
                  shareId={shareId}
                  isChatActive={isChatActive}
                  onAddToContext={onAddToContext}
                />
              )}
            </div>
          </ContextMenuMain>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 gap-0 py-0 pr-0">
            {nodeUI?.expanded &&
              node.hasChildren &&
              node.children.length > 0 &&
              node.children.map(childId => (
                <ResourceNode
                  nodeId={childId}
                  key={childId}
                  shareId={shareId}
                  showChat={showChat}
                  isChatActive={isChatActive}
                  isResourceActive={isResourceActive}
                  onAddToContext={onAddToContext}
                />
              ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
