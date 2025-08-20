import { useParams } from 'react-router-dom';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from '@/components/ui/sidebar';

import SidebarItem from './sidebar-item';

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
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarItem
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
