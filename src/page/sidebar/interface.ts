import { ResourceType, SpaceType } from '@/interface';

export interface ISidebarProps {
  data: any;
  spaceType: SpaceType;
  activeKey?: string;
  resourceId: string;
  expanding: string;
  editingKey: string;
  namespaceId: string;
  expands: Array<string>;
  onActiveKey: (id: string, edit?: boolean) => void;
  onUpload: (
    spaceType: SpaceType,
    parentId: string,
    file: FileList
  ) => Promise<void>;
  onExpand: (spaceType: SpaceType, id: string) => void;
  onMenuMore: (spaceType: SpaceType, id: string) => void;
  onDelete: (spaceType: SpaceType, id: string, parentId: string) => void;
  onCreate: (
    spaceType: SpaceType,
    parentId: string,
    resourceType: ResourceType
  ) => void;
}
