import Space from './space';
import group from '@/lib/group';
import type { SpaceType } from '@/interface';
import { ISidebarProps } from '@/page/sidebar/interface';
import { SidebarContent } from '@/components/ui/sidebar';

interface IProps extends Omit<ISidebarProps, 'spaceType'> {}

export default function Content(props: IProps) {
  const { data, resourceId } = props;

  return (
    <SidebarContent>
      {Object.keys(data)
        .sort()
        .map((spaceType) => (
          <Space
            {...props}
            key={spaceType}
            activeKey={resourceId}
            data={group(data[spaceType])}
            spaceType={spaceType as SpaceType}
          />
        ))}
    </SidebarContent>
  );
}
