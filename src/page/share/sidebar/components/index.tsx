import { SidebarContent } from '@/components/ui/Sidebar';
import { ResourceMeta } from '@/interface';

import SpaceSection from './SpaceSection';

interface ResourceTreeProps {
  shareId: string;
  showChat: boolean;
  isChatActive: boolean;
  isResourceActive: (resourceId: string) => boolean;
  onAddToContext: (resource: ResourceMeta, type: 'resource' | 'folder') => void;
  canBrowseResources: boolean;
  showResources?: boolean;
}

export default function ResourceTree(props: ResourceTreeProps) {
  const { showResources = true } = props;
  return (
    <SidebarContent className="no-scrollbar gap-0">
      {showResources && <SpaceSection {...props} />}
    </SidebarContent>
  );
}
