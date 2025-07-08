import Space from './space';
import { useState } from 'react';
import group from '@/lib/group';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { ISidebarProps } from '@/page/sidebar/interface';
import type { IResourceData, SpaceType } from '@/interface';
import { SidebarContent, useSidebar } from '@/components/ui/sidebar';

export interface IProps extends Omit<ISidebarProps, 'spaceType'> {
  onDrop: (item: IResourceData, target: IResourceData | null) => void;
}

export default function Content(props: IProps) {
  const { data, resourceId, onDrop } = props;
  const { isMobile } = useSidebar();
  const [target, onTarget] = useState<IResourceData | null>(null);
  const handleDrop = (resource: IResourceData, item: IResourceData | null) => {
    onDrop(resource, item);
    onTarget(null);
  };

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <SidebarContent>
        {Object.keys(data)
          .sort()
          .map((spaceType: string) => (
            <Space
              {...props}
              key={spaceType}
              target={target}
              onTarget={onTarget}
              onDrop={handleDrop}
              activeKey={resourceId}
              data={group(data[spaceType])}
              spaceType={spaceType as SpaceType}
            />
          ))}
      </SidebarContent>
    </DndProvider>
  );
}
