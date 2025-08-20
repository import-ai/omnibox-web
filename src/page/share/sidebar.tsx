import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { ShareResourceMeta } from '@/interface';

import SidebarItem from './sidebar-item';

interface SharedSidebarProps {
  shareId: string;
  currentResourceId: string;
  rootResource: ShareResourceMeta;
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
                level={0}
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
