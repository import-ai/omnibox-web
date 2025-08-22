import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { SharedResourceMeta } from '@/interface';

import SidebarItem from './sidebar-item';

interface SharedSidebarProps {
  shareId: string;
  currentResourceId: string;
  rootResource: SharedResourceMeta;
}

export default function ShareSidebar(props: SharedSidebarProps) {
  const { shareId, currentResourceId, rootResource } = props;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarItem
                shareId={shareId}
                resource={rootResource}
                currentResourceId={currentResourceId}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
