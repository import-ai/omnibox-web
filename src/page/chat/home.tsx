import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import { http } from '@/lib/request';
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
    decisions,
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
            decisions,
            conversation: {
              id: conversation.id,
            } as ConversationDetail,
          } as ChatCreatePayload)
        );
        navigate(`/${namespaceId}/chat/${conversation.id}`);
      });
  };

  return (
    <div className="flex justify-center flex-1 p-4 overflow-auto">
      <div className="flex flex-col h-full max-w-3xl w-full">
        <div className="flex flex-col justify-center flex-1 mb-8">
          <h1 className="text-[28px] text-center mb-[32px] font-medium">
            <Typewriter text={t(i18n)} typeSpeed={32} />
          </h1>
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
