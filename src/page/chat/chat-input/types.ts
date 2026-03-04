import { ResourceMeta } from '@/interface.ts';

// Re-export from SDK
export { ChatMode, ToolType } from '@omnibox/react-common';

export type ChatActionType = 'stop' | 'disabled';

export type PrivateSearchResourceType = 'resource' | 'folder';

export interface IResTypeContext {
  type: PrivateSearchResourceType;
  resource: ResourceMeta;
}
