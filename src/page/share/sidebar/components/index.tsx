import { SidebarContent } from '@/components/ui/sidebar';
import { ResourceMeta } from '@/interface';

import SpaceSection from './space-section';

interface ResourceTreeProps {
  shareId: string;
  showChat: boolean;
  isChatActive: boolean;
  isResourceActive: (resourceId: string) => boolean;
  onAddToContext: (resource: ResourceMeta, type: 'resource' | 'folder') => void;
}

export default function ResourceTree(props: ResourceTreeProps) {
  return (
    <SidebarContent className="no-scrollbar gap-0">
      <SpaceSection {...props} />
    </SidebarContent>
  );
}
