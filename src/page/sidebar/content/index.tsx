import Space from './space';
import { useState } from 'react';
import group from '@/lib/group';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ISidebarProps } from '@/page/sidebar/interface';
import { SidebarContent } from '@/components/ui/sidebar';
import { IResourceData } from '@/interface';

export interface IProps extends ISidebarProps {
  onDrop: (
    resource: IResourceData,
    args: { pos: string; target: IResourceData | null },
  ) => void;
}

export default function Content(props: IProps) {
  const { data, resourceId, onDrop } = props;
  const [highlight, onHighlight] = useState<{
    pos: string;
    target: IResourceData | null;
  }>({
    pos: '',
    target: null,
  });
  const handleDrop = (
    resource: IResourceData,
    args: { pos: string; target: IResourceData | null },
  ) => {
    onDrop(resource, args);
    onHighlight({ pos: '', target: null });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <SidebarContent>
        {Object.keys(data)
          .sort()
          .map((spaceType: string) => (
            <Space
              {...props}
              key={spaceType}
              onDrop={handleDrop}
              activeKey={resourceId}
              spaceType={spaceType}
              data={group(data[spaceType])}
              highlight={highlight}
              onHighlight={onHighlight}
            />
          ))}
      </SidebarContent>
    </DndProvider>
  );
}
