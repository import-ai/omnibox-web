import { ResourceMeta } from '@/interface.ts';

export enum ToolType {
  WEB_SEARCH = 'web_search',
  PRIVATE_SEARCH = 'private_search',
  REASONING = 'reasoning',
}

export type ChatActionType = 'stop' | 'disabled';

export type PrivateSearchResourceType = 'resource' | 'folder';

export interface IResTypeContext {
  type: PrivateSearchResourceType;
  resource: ResourceMeta;
}

export enum ChatMode {
  ASK = 'ask',
  WRITE = 'write',
}
