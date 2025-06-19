import Space from './space';
import group from '@/lib/group';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ISidebarProps } from '@/page/sidebar/interface';
import { SidebarContent } from '@/components/ui/sidebar';

export default function Content(props: ISidebarProps) {
  const { data, resourceId } = props;

  return (
    <DndProvider backend={HTML5Backend}>
      <SidebarContent>
        {Object.keys(data)
          .sort()
          .map((spaceType: string) => (
            <Space
              {...props}
              key={spaceType}
              activeKey={resourceId}
              spaceType={spaceType}
              data={group(data[spaceType])}
            />
          ))}
      </SidebarContent>
    </DndProvider>
  );
}
