import Space from './space';
import group from '@/lib/group';
import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { useIsMobile } from '@/hooks/use-mobile';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { ISidebarProps } from '@/page/sidebar/interface';
import { SidebarContent } from '@/components/ui/sidebar';
import type { IResourceData, SpaceType } from '@/interface';

export interface IProps extends Omit<ISidebarProps, 'spaceType'> {
  onDrop: (item: IResourceData, target: IResourceData | null) => void;
}

export default function Content(props: IProps) {
  const { data, resourceId, onDrop } = props;
  const isMobile = useIsMobile();
  const [target, onTarget] = useState<IResourceData | null>(null);
  const handleDrop = (resource: IResourceData, item: IResourceData | null) => {
    onDrop(resource, item);
    onTarget(null);
  };

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <SidebarContent className="gap-0">
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
