import { ChevronRight, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar';
import { ResourceMeta } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  shareId: string;
  resource: ResourceMeta;
  isResourceActive: (resourceId: string) => boolean;
}

export default function SidebarItem(props: SidebarItemProps) {
  const { shareId, resource, isResourceActive } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<ResourceMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChildren, setHasChildren] = useState(true);
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
    navigate(`/s/${shareId}/${resource.id}`);
  };

  return (
    <SidebarMenuItem>
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
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      ) : (
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
      )}
    </SidebarMenuItem>
  );
}
