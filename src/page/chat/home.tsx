import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import { http } from '@/lib/request';
import { AgentTrial } from '@/page/chat/agent-trial/agent-trial.tsx';
import {
  ChatCreatePayload,
  ConversationEntity,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import { ConversationDetail } from '@/page/chat/core/types/conversation.ts';

import ChatArea from './chat-input';
import FeatureCards from './home/feature-cards';
import useSelectedResources from './useSelectedResources.ts';
import { getGreeting } from './utils';

export default function ChatHomePage() {
  const params = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const namespaceId = params.namespace_id || '';
  const i18n = `chat.home.greeting.${getGreeting()}`;
  const { selectedResources, setSelectedResources } = useSelectedResources();
  const sendMessage = ({
    query,
    tools,
    selectedResources,
    mode,
  }: SendMessageParams) => {
    http
      .post(`/namespaces/${namespaceId}/conversations`)
      .then((conversation: ConversationEntity) => {
        sessionStorage.setItem(
          'chat-create-payload',
          JSON.stringify({
            mode,
            query,
            tools,
            selectedResources,
            conversation: {
              id: conversation.id,
            } as ConversationDetail,
          } as ChatCreatePayload)
        );
        navigate(`/${namespaceId}/chat/${conversation.id}`);
      });
  };

  return (
    <div className="flex flex-1 justify-center overflow-auto p-4">
      <div className="flex size-full max-w-3xl flex-col">
        <div className="mb-8 flex flex-1 flex-col justify-center">
          <h1 className="mb-[32px] text-center text-[28px] font-medium">
            <Typewriter text={t(i18n)} typeSpeed={32} />
          </h1>
          <AgentTrial namespaceId={namespaceId} />
          <ChatArea
            messages={[]}
            navigatePrefix={`/${namespaceId}`}
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            loading={false}
            sendMessage={sendMessage}
          />
        </div>
        <FeatureCards />
      </div>
    </div>
  );
}
