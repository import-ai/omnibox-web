import { SpaceType, ResourceType } from '@/interface';

export interface IActionProps {
  data: any;
  spaceType: string;
  activeKey: string;
  expanding: string;
  editingKey: string;
  expands: Array<string>;
  onActiveKey: (id: string) => void;
  onUpload: (spaceType: string, parentId: string, file: File) => Promise<void>;
  onExpand: (id: string, spaceType: SpaceType) => void;
  onMenuMore: (id: string, spaceType: SpaceType) => void;
  onDelete: (id: string, spaceType: SpaceType, parentId: string) => void;
  onCreate: (
    spaceType: string,
    parentId: string,
    resourceType: ResourceType,
  ) => void;
}
