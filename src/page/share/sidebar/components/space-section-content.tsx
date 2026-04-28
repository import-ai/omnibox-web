import { useTranslation } from 'react-i18next';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import type { TreeNode } from '@/page/share/sidebar/store';
import { useSidebarStore } from '@/page/share/sidebar/store';

import ResourceNode from './resource-node';
import { ResourceTreeProps } from './resource-node';

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
            className="mr-4 block h-full font-normal leading-8 text-neutral-400"
          >
            {t('share.share.title')}
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
