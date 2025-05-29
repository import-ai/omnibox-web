import { IBase } from '@/interface';

export enum MessageStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  STOPPED = 'stopped',
  FAIL = 'fail',
}

export enum OpenAIMessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

interface OpenAIMessage {
  role: OpenAIMessageRole;
  content?: string;
  tool_calls?: Record<string, any>[];
  reasoning_content?: string;
}

export interface MessageDetail extends IBase {
  id: string;
  message: OpenAIMessage;
  status: MessageStatus;
  parent?: string;
  children: string[];
  attrs?: { citations?: Record<string, any>[] };
}

export interface IConversationDetail extends IBase {
  id: string;
  title?: string;
  mapping: Record<string, MessageDetail>;
  current_node: string;
}

export class ConversationDetail implements IConversationDetail {
  id: string;
  title?: string;
  mapping: Record<string, MessageDetail>;
  current_node: string;
  created_at?: string | undefined;
  updated_at?: string | undefined;
  deleted_at?: string | undefined;

  constructor(data: IConversationDetail) {
    this.id = data.id;
    this.title = data.title;
    this.mapping = data.mapping;
    this.current_node = data.current_node;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deleted_at = data.deleted_at;
  }

  get messages(): MessageDetail[] {
    const messages: MessageDetail[] = [];
    let currentNode: string | undefined = this.current_node;
    while (currentNode) {
      const message: MessageDetail = this.mapping[currentNode];
      messages.unshift(message);
      currentNode = message.parent;
    }
    return messages;
  }

  public getMessage(targetRole: OpenAIMessageRole): MessageDetail | undefined {
    for (const message of this.messages) {
      if (message.message.role === targetRole && message.message.content) {
        return message;
      }
    }
    return undefined;
  }

  /**
   * When there is multi message, activate one of them.
   * Designed for future, now enabled for now.
   * @param messageId
   */
  public activate(messageId: string) {
    let currentNode = messageId;
    let children: string[] = this.mapping[currentNode].children;
    while (children.length > 0) {
      currentNode = children[children.length - 1];
      children = this.mapping[currentNode].children;
    }
    this.current_node = currentNode;
    return this.messages;
  }
}

export interface ConversationSummary extends IBase {
  id: string;
  title: string;
  user_content?: string;
  assistant_content?: string;
}
