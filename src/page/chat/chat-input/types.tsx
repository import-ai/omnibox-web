import { Resource } from '@/interface.ts';

export enum ToolType {
  WEB_SEARCH = 'web_search',
  KNOWLEDGE_SEARCH = 'knowledge_search',
  REASONING = 'reasoning',
}

export type ChatActionType = 'stop' | 'disabled';

export interface IResTypeContext {
  type: string;
  resource: Resource;
}

export enum ChatMode {
  ASK = 'ask',
  WRITE = 'write',
}
