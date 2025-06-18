import Space from './space';
import group from '@/lib/group';
import { SpaceType, ResourceType } from '@/interface';
import { SidebarContent } from '@/components/ui/sidebar';

interface IProps {
  data: any;
  resourceId: string;
  expanding: string;
  editingKey: string;
  expands: Array<string>;
  handleActiveKey: (id: string) => void;
  handleUpload: (
    spaceType: string,
    parentId: string,
    file: File,
  ) => Promise<void>;
  handleExpand: (id: string, spaceType: SpaceType) => void;
  handleMenuMore: (id: string, spaceType: SpaceType) => void;
  handleDelete: (id: string, spaceType: SpaceType, parentId: string) => void;
  handleCreate: (
    spaceType: string,
    parentId: string,
    resourceType: ResourceType,
  ) => void;
}

export default function Content(props: IProps) {
  const {
    data,
    expands,
    expanding,
    editingKey,
    resourceId,
    handleExpand,
    handleDelete,
    handleCreate,
    handleUpload,
    handleMenuMore,
    handleActiveKey,
  } = props;

  return (
    <SidebarContent>
      {Object.keys(data)
        .sort()
        .map((space_type: string) => (
          <Space
            key={space_type}
            expands={expands}
            expanding={expanding}
            activeKey={resourceId}
            spaceType={space_type}
            editingKey={editingKey}
            onExpand={handleExpand}
            onDelete={handleDelete}
            onCreate={handleCreate}
            onUpload={handleUpload}
            onMenuMore={handleMenuMore}
            onActiveKey={handleActiveKey}
            data={group(data[space_type])}
          />
        ))}
    </SidebarContent>
  );
}
