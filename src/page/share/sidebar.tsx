import { ChevronRight, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

interface SharedResourceChild {
  id: string;
  name: string;
}

interface SharedResourceTreeItemProps {
  shareId: string;
  resourceId: string;
  name: string;
  level: number;
  currentResourceId?: string;
}

function SharedResourceTreeItem({
  shareId,
  resourceId,
  name,
  level,
  currentResourceId,
}: SharedResourceTreeItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<SharedResourceChild[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChildren, setHasChildren] = useState(true);
  const isActive = currentResourceId === resourceId;

  const fetchChildren = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const data = await http.get(
        `/shares/${shareId}/resources/${resourceId}/children`
      );
      setChildren(data || []);
      setHasChildren(data && data.length > 0);
    } catch {
      setHasChildren(false);
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
    navigate(`/s/${shareId}/${resourceId}`);
  };

  return (
    <SidebarMenuItem>
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
                style={{ paddingLeft: `${level * 12}px` }}
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
                )}
                {!hasChildren && <div className="w-4 h-4" />}
                <span className="truncate ml-1">{name || t('untitled')}</span>
              </div>
            </SidebarMenuButton>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="pr-0 mr-0">
            {children.map(child => (
              <SharedResourceTreeItem
                key={child.id}
                shareId={shareId}
                resourceId={child.id}
                name={child.name}
                level={level + 1}
                currentResourceId={currentResourceId}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

interface SharedSidebarProps {
  shareId: string;
  rootResourceId: string;
  rootResourceName: string;
}

export default function ShareSidebar({
  shareId,
  rootResourceId,
  rootResourceName,
}: SharedSidebarProps) {
  const params = useParams();
  const currentResourceId = params.resource_id;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Shared Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SharedResourceTreeItem
                shareId={shareId}
                resourceId={rootResourceId}
                name={rootResourceName}
                level={0}
                currentResourceId={currentResourceId}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
