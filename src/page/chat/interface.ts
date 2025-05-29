import { IBase } from '@/interface';

export enum MessageStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  STOPPED = 'stopped',
  FAIL = 'fail',
}

interface MessageDetail extends IBase {
  id: string;
  message: Record<string, any>;
  status: MessageStatus;
  parent?: string;
  children: string[];
  attrs?: Record<string, any>;
}

export interface ConversationDetail extends IBase {
  id: string;
  title: string;
  mapping: Record<string, MessageDetail>;
  current_node: string;
}

export interface ConversationSummary extends IBase {
  id: string;
  title: string;
  snippet?: string;
}
