import { IResourceData, ResourceType, SpaceType } from '@/interface';

import { CreateSmartFolderPayload } from './content/smart-folder-types';

export interface ISidebarProps {
  data: IResourceData;
  spaceRoot?: IResourceData;
  spaceType: SpaceType;
  activeKey?: string;
  progress: string;
  resourceId: string;
  expanding: string;
  editingKey: string;
  namespaceId: string;
  expands: Array<string>;
  open?: boolean;
  onActiveKey: (id: string, edit?: boolean, sidebarActiveKey?: string) => void;
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
  ) => Promise<void>;
  onCreateSmartFolder: (
    spaceType: SpaceType,
    parentId: string,
    payload: CreateSmartFolderPayload
  ) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
  onSpaceToggle: (spaceType: string, open?: boolean) => void;
}
