import { isFunction } from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import {
  type ChatActionType,
  ChatMode,
  ToolType,
} from '@/page/chat/chat-input/types';
import {
  createMessageOperator,
  MessageOperator,
} from '@/page/chat/conversation/message-operator';
import { Messages } from '@/page/chat/messages';
import { normalizeChatData } from '@/page/chat/normalize-chat';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';
import useGlobalContext from '@/page/chat/useContext';

import ChatArea from '../chat-input';
import Scrollbar from './scrollbar';
import { ask } from './utils';

export default function SharedChatConversationPage() {
  const { t } = useTranslation();

  // Moved useContext logic inline
  const app = useApp();
  const params = useParams();
  const [value, onChange] = useState<string>('');
  const askAbortRef = useRef<() => void>(null);
  const shareId = params.share_id || '';
  const conversationId = params.conversation_id || '';
  const [tools, onToolsChange] = useState<Array<ToolType>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const { context, onContextChange } = useGlobalContext({
    data: [],
  });
  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });

  const refetch = () => {
    return http
      .get(`/shares/${shareId}/conversations/${conversationId}`)
      .then(response => {
        if (response.title) {
          app.fire('chat:title:update', response.title);
        }
        setConversation(response);
      });
  };

  const messages = useMemo((): MessageDetail[] => {
    const result: MessageDetail[] = [];
    let currentNode: string | undefined = conversation.current_node;
    while (currentNode) {
      const message = conversation.mapping[currentNode];
      if (!message) {
        break;
      }
      result.unshift(message);
      currentNode = message.parent_id;
    }
    return result;
  }, [conversation]);

  const messageOperator = useMemo((): MessageOperator => {
    return createMessageOperator(setConversation);
  }, [setConversation]);

  const onAction = async (action?: ChatActionType) => {
    if (action === 'stop') {
      isFunction(askAbortRef.current) && askAbortRef.current();
      setLoading(false);
      return;
    } else {
      const v = value.trim();
      if (v) {
        onChange('');
        await submit(v);
      }
    }
  };

  const submit = async (query?: string) => {
    if (!query || query.trim().length === 0) {
      return;
    }
    setLoading(true);
    try {
      const askFN = ask(
        shareId,
        conversationId,
        query,
        tools,
        context,
        messages,
        messageOperator
      );
      askAbortRef.current = askFN.destory;
      await askFN.start();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <Scrollbar>
        <Messages messages={normalizeChatData(messages)} />
      </Scrollbar>
      <div className="flex justify-center px-4">
        <div className="flex-1 max-w-3xl w-full">
          <ChatArea
            mode={mode}
            tools={tools}
            value={value}
            setMode={setMode}
            loading={loading}
            context={context}
            onChange={onChange}
            onAction={onAction}
            onToolsChange={onToolsChange}
            onContextChange={onContextChange}
          />
          <div className="text-center text-xs pt-2 text-muted-foreground truncate">
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
