import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
} from '@/components/ui/Sidebar';
import { cn } from '@/lib/utils';
import type { TreeNode } from '@/page/share/sidebar/store';
import { useSidebarStore } from '@/page/share/sidebar/store';

import ResourceNode from './ResourceNode';
import { ResourceTreeProps } from './ResourceNode';

interface SpaceSectionContentProps {
  rootNode: TreeNode;
  isOpen: boolean;
}

export function SpaceSectionContent({
  rootNode,
  isOpen,
  ...nodeProps
}: SpaceSectionContentProps & ResourceTreeProps) {
  const { t } = useTranslation();
  const handleHeaderToggle = () => {
    useSidebarStore.getState().toggleSpace('share');
  };

  return (
    <SidebarGroup className="pr-0">
      <SidebarMenuButton className="group/sidebar-header h-8 pb-px pt-0">
        <div className="relative size-full">
          <SidebarGroupLabel
            onClick={handleHeaderToggle}
            className="mr-4 flex h-full items-center gap-1 font-normal leading-8 text-neutral-400"
          >
            {t('share.share.title')}
            <ChevronRight
              className={cn(
                '!size-3 shrink-0 text-neutral-300 transition-transform dark:text-neutral-500',
                isOpen && 'rotate-90'
              )}
            />
          </SidebarGroupLabel>
        </div>
      </SidebarMenuButton>
      {isOpen && (
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {rootNode.hasChildren &&
              rootNode.children.length > 0 &&
              rootNode.children.map(childId => (
                <ResourceNode nodeId={childId} key={childId} {...nodeProps} />
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}
