import Space from './space';
import group from '@/lib/group';
import { ISidebarProps } from '@/page/sidebar/interface';
import { SidebarContent } from '@/components/ui/sidebar';

export default function Content(props: ISidebarProps) {
  const { data, resourceId } = props;

  return (
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
  );
}
