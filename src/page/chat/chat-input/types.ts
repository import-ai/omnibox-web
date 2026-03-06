import { ResourceMeta } from '@/interface';

export type ChatActionType = 'stop' | 'disabled';

export type PrivateSearchResourceType = 'resource' | 'folder';

export interface IResTypeContext {
  type: PrivateSearchResourceType;
  resource: ResourceMeta;
}
