import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import { SidebarContent } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import type { IResourceData, SpaceType } from '@/interface';
import group from '@/lib/group';
import { ISidebarProps } from '@/page/sidebar/interface';

import Space from './space';

export interface IProps extends Omit<ISidebarProps, 'spaceType'> {
  onDrop: (item: IResourceData, target: IResourceData | null) => void;
}

export default function Content(props: IProps) {
  const { data, resourceId, onDrop } = props;
  const isMobile = useIsMobile();
  const [target, onTarget] = useState<IResourceData | null>(null);
  const [fileDragTarget, setFileDragTarget] = useState<string | null>(null);
  const handleDrop = (resource: IResourceData, item: IResourceData | null) => {
    onDrop(resource, item);
    onTarget(null);
  };

  // Clean up file drag state when drag ends
  useEffect(() => {
    const handleDragEnd = () => {
      setFileDragTarget(null);
    };

    document.addEventListener('dragend', handleDragEnd);
    return () => {
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <SidebarContent className="gap-0 no-scrollbar">
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
              fileDragTarget={fileDragTarget}
              onFileDragTarget={setFileDragTarget}
            />
          ))}
      </SidebarContent>
    </DndProvider>
  );
}
