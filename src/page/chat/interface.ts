import { IBase, User, Namespace } from '@/interface';

interface Message extends IBase {
  id: string;
  conversation: Conversation;
  user: User;
  parentId?: string;
  message: Record<string, any>;
  attrs?: Record<string, any>;
}

export interface Conversation extends IBase {
  id: string;
  title: string;
  namespace: Namespace;
  user: User;
  messages?: Message[];
}
