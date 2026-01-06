import { IResourceData, ResourceType, SpaceType } from '@/interface';

export interface ISidebarProps {
  data: IResourceData;
  spaceType: SpaceType;
  activeKey?: string;
  progress: string;
  resourceId: string;
  expanding: string;
  editingKey: string;
  namespaceId: string;
  expands: Array<string>;
  open?: boolean;
  onActiveKey: (id: string, edit?: boolean) => void;
  onUpload: (
    spaceType: SpaceType,
    parentId: string,
    file: FileList
  ) => Promise<void>;
  onExpand: (spaceType: SpaceType, id: string) => void;
  onDelete: (spaceType: SpaceType, id: string, parentId: string) => void;
  onCreate: (
    spaceType: SpaceType,
    parentId: string,
    resourceType: ResourceType,
    initialName?: string
  ) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onSpaceToggle: (spaceType: string, open?: boolean) => void;
}
