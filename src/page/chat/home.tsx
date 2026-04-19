import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { ChatMode, InputMode, ToolType } from '@/page/chat/chat-input/types';
import {
  ChatCreatePayload,
  ConversationEntity,
} from '@/page/chat/core/types/chat-create-payload.ts';
import { ConversationDetail } from '@/page/chat/core/types/conversation.ts';

import ChatArea from './chat-input';
import FeatureCards from './home/feature-cards';
import useContext from './useContext';
import { getGreeting } from './utils';

export default function ChatHomePage() {
  const app = useApp();
  const params = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const namespaceId = params.namespace_id || '';
  const i18n = `chat.home.greeting.${getGreeting()}`;
  const { context, onContextChange } = useContext();
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const [tools, onToolsChange] = useState<Array<ToolType>>([
    ToolType.PRIVATE_SEARCH,
  ]);
  const callbacks = {
    sendMessage: (query: string) => {
      http
        .post(`/namespaces/${namespaceId}/conversations`)
        .then((conversation: ConversationEntity) => {
          sessionStorage.setItem(
            'chatConversationPayload',
            JSON.stringify({
              mode,
              query,
              tools,
              context,
              conversation: {
                id: conversation.id,
                title: conversation.title,
              } as ConversationDetail,
            } as ChatCreatePayload)
          );
          navigate(`/${namespaceId}/chat/${conversation.id}`);
        });
    },
    stopStreaming: () => {},
  };

  useEffect(() => {
    app.fire('chat:title');
  }, []);

  return (
    <div className="flex justify-center flex-1 p-4 overflow-auto">
      <div className="flex flex-col h-full max-w-3xl w-full">
        <div className="flex flex-col justify-center flex-1 mb-8">
          <h1 className="text-[28px] text-center mb-[32px] font-medium">
            <Typewriter text={t(i18n)} typeSpeed={32} />
          </h1>
          <ChatArea
            mode={mode}
            tools={tools}
            loading={false}
            context={context}
            inputMode={InputMode.TEXT}
            pendingInterrupts={[]}
            onDecision={() => {}}
            setMode={setMode}
            callbacks={callbacks}
            onToolsChange={onToolsChange}
            onContextChange={onContextChange}
            navigatePrefix={`/${namespaceId}`}
          />
        </div>
        <FeatureCards />
      </div>
    </div>
  );
}
